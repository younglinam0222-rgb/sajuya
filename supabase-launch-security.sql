-- REVIEW ON STAGING FIRST. Does not mark legacy client-authored paid flags as trusted.
BEGIN;
ALTER TABLE public.readings ADD COLUMN IF NOT EXISTS user_email text;
ALTER TABLE public.readings ADD COLUMN IF NOT EXISTS occupation_id text DEFAULT 'general';
ALTER TABLE public.readings ADD COLUMN IF NOT EXISTS access_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.readings ADD COLUMN IF NOT EXISTS share_token text UNIQUE;
ALTER TABLE public.readings ADD COLUMN IF NOT EXISTS product text NOT NULL DEFAULT 'saju';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS daily_trial_used boolean NOT NULL DEFAULT false;
-- NextAuth sessions are verified by our server; browser clients have no direct table access.
DO $$ DECLARE t text; p record; BEGIN
 FOREACH t IN ARRAY ARRAY['users','readings','payments','daily_readings','reading_cache'] LOOP
  IF to_regclass('public.'||t) IS NOT NULL THEN
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
   FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
    EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
   END LOOP;
  END IF;
 END LOOP;
 IF to_regclass('public.cache_stats') IS NOT NULL THEN
  REVOKE ALL ON public.cache_stats FROM anon, authenticated;
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.commerce_orders (
 order_id text PRIMARY KEY, user_id text NOT NULL REFERENCES public.users(id),
 product text NOT NULL CHECK(product IN ('one','three','unlock')),
 amount integer NOT NULL CHECK(amount>0), coins integer NOT NULL CHECK(coins>=0),
 reading_id uuid REFERENCES public.readings(id), payment_key text UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done','canceled')),
 consent_version text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.generation_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES public.users(id),
 fingerprint text NOT NULL, product text NOT NULL, status text NOT NULL DEFAULT 'running',
 attempt uuid NOT NULL DEFAULT gen_random_uuid(), trial boolean NOT NULL DEFAULT false,
 input jsonb NOT NULL, response text, reading_id uuid REFERENCES public.readings(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,fingerprint)
);
CREATE TABLE IF NOT EXISTS public.generation_requests (
 user_id text NOT NULL REFERENCES public.users(id), request_id text NOT NULL,
 job_id uuid NOT NULL REFERENCES public.generation_jobs(id), PRIMARY KEY(user_id,request_id)
);
CREATE TABLE IF NOT EXISTS public.generation_attempts (
 id uuid PRIMARY KEY, user_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ai_usage (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid REFERENCES public.generation_jobs(id),
 model text NOT NULL, input_tokens integer NOT NULL, output_tokens integer NOT NULL,
 cache_read_tokens integer NOT NULL DEFAULT 0, cache_creation_tokens integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.commerce_orders,public.generation_jobs,public.generation_requests,public.generation_attempts,public.ai_usage TO service_role;
ALTER TABLE public.commerce_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commerce_orders, public.generation_jobs, public.generation_requests, public.generation_attempts, public.ai_usage FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_generation(p_user text,p_hash text,p_product text,p_request text,p_input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u users; j generation_jobs; a uuid; linked uuid; stale generation_jobs;
BEGIN
 SELECT * INTO u FROM users WHERE id=p_user FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('error','account'); END IF;
 IF p_product NOT IN ('saju','daily','gunghap','daeun','yearly','taekil') THEN RAISE EXCEPTION 'product'; END IF;
 -- A terminated server cannot leave a reservation charged forever. Max route duration is 300s.
 FOR stale IN SELECT * FROM generation_jobs WHERE user_id=p_user AND status='running' AND updated_at<now()-interval '20 minutes' FOR UPDATE LOOP
  IF NOT stale.trial THEN UPDATE users SET yeobjeun_balance=yeobjeun_balance+1 WHERE id=p_user; END IF;
  UPDATE generation_jobs SET status='failed',updated_at=now() WHERE id=stale.id;
 END LOOP;
 SELECT * INTO u FROM users WHERE id=p_user;
 SELECT * INTO j FROM generation_jobs WHERE user_id=p_user AND fingerprint=p_hash FOR UPDATE;
 SELECT job_id INTO linked FROM generation_requests WHERE user_id=p_user AND request_id=p_request;
 IF linked IS NOT NULL AND (j.id IS NULL OR linked<>j.id) THEN RETURN jsonb_build_object('error','conflict'); END IF;
 IF j.id IS NOT NULL THEN
  INSERT INTO generation_requests VALUES(p_user,p_request,j.id) ON CONFLICT DO NOTHING;
  IF j.status='done' THEN RETURN jsonb_build_object('cached',true,'response',j.response,'id',j.id); END IF;
  IF j.status='running' THEN RETURN jsonb_build_object('error','busy'); END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM generation_jobs WHERE user_id=p_user AND status='running') THEN RETURN jsonb_build_object('error','busy'); END IF;
 IF (SELECT count(*) FROM generation_attempts WHERE user_id=p_user AND created_at>now()-interval '10 minutes')>=6 THEN RETURN jsonb_build_object('error','rate'); END IF;
 -- Daily pricing after the one lifetime trial is deliberately not invented here.
 IF p_product='daily' AND u.daily_trial_used THEN RETURN jsonb_build_object('error','trial_used'); END IF;
 IF p_product<>'daily' AND u.yeobjeun_balance<1 THEN RETURN jsonb_build_object('error','balance'); END IF;
 a=gen_random_uuid();
 IF j.id IS NULL THEN
  INSERT INTO generation_jobs(user_id,fingerprint,product,attempt,trial,input)
   VALUES(p_user,p_hash,p_product,a,p_product='daily',p_input) RETURNING * INTO j;
 ELSE
  UPDATE generation_jobs SET status='running',attempt=a,updated_at=now() WHERE id=j.id RETURNING * INTO j;
 END IF;
 INSERT INTO generation_attempts(id,user_id) VALUES(a,p_user);
 INSERT INTO generation_requests VALUES(p_user,p_request,j.id) ON CONFLICT DO NOTHING;
 IF NOT j.trial THEN UPDATE users SET yeobjeun_balance=yeobjeun_balance-1 WHERE id=p_user; END IF;
 RETURN jsonb_build_object('id',j.id,'attempt',a);
END $$;

CREATE OR REPLACE FUNCTION public.finish_generation(p_job uuid,p_attempt uuid,p_success boolean,p_response text DEFAULT NULL,p_result jsonb DEFAULT NULL,p_manse jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j generation_jobs; rid uuid; sid text; uid text;
BEGIN
 SELECT user_id INTO uid FROM generation_jobs WHERE id=p_job;
 PERFORM 1 FROM users WHERE id=uid FOR UPDATE;
 SELECT * INTO j FROM generation_jobs WHERE id=p_job FOR UPDATE;
 IF j.id IS NULL OR j.attempt IS DISTINCT FROM p_attempt OR j.status<>'running' THEN RETURN jsonb_build_object('error','stale'); END IF;
 IF NOT p_success THEN
  IF NOT j.trial THEN UPDATE users SET yeobjeun_balance=yeobjeun_balance+1 WHERE id=j.user_id; END IF;
  UPDATE generation_jobs SET status='failed',updated_at=now() WHERE id=j.id;
  RETURN jsonb_build_object('refunded',true);
 END IF;
 IF p_result IS NULL OR p_response IS NULL THEN RAISE EXCEPTION 'missing result'; END IF;
 sid=replace(gen_random_uuid()::text,'-','');
 INSERT INTO readings(share_id,user_id,character_id,occupation_id,saju_data,ai_result,is_paid,access_verified,product)
 VALUES(sid,j.user_id,coalesce(j.input->>'characterId','sinRyeong'),coalesce(j.input->>'occupation','general'),
 jsonb_build_object('form',j.input,'saju',p_manse,'partner',j.input->'partnerInfo'),p_result::text,NOT j.trial,true,j.product) RETURNING id INTO rid;
 IF j.trial THEN UPDATE users SET daily_trial_used=true WHERE id=j.user_id; END IF;
 UPDATE generation_jobs SET status='done',reading_id=rid,response=p_response,updated_at=now() WHERE id=j.id;
 RETURN jsonb_build_object('shareId',sid);
END $$;

CREATE OR REPLACE FUNCTION public.bind_payment(p_user text,p_order text,p_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o commerce_orders;
BEGIN
 SELECT * INTO o FROM commerce_orders WHERE order_id=p_order AND user_id=p_user FOR UPDATE;
 IF o.order_id IS NULL OR (o.payment_key IS NOT NULL AND o.payment_key<>p_key) THEN RETURN false; END IF;
 UPDATE commerce_orders SET payment_key=p_key WHERE order_id=p_order;
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.complete_payment(p_order text,p_key text,p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o commerce_orders; sid text; uid text;
BEGIN
 SELECT user_id INTO uid FROM commerce_orders WHERE order_id=p_order;
 PERFORM 1 FROM users WHERE id=uid FOR UPDATE;
 SELECT * INTO o FROM commerce_orders WHERE order_id=p_order FOR UPDATE;
 IF o.order_id IS NULL OR o.amount<>p_amount OR o.payment_key IS DISTINCT FROM p_key OR p_key IS NULL THEN RAISE EXCEPTION 'payment mismatch'; END IF;
 IF o.status='canceled' THEN RAISE EXCEPTION 'canceled'; END IF;
 IF o.status<>'done' THEN
  IF o.product='unlock' THEN
   UPDATE readings SET is_paid=true,access_verified=true WHERE id=o.reading_id AND user_id=o.user_id RETURNING share_id INTO sid;
   IF sid IS NULL THEN RAISE EXCEPTION 'reading missing'; END IF;
  ELSE
   UPDATE users SET yeobjeun_balance=yeobjeun_balance+o.coins WHERE id=o.user_id;
  END IF;
  UPDATE commerce_orders SET status='done',completed_at=now() WHERE order_id=p_order;
 END IF;
 SELECT share_id INTO sid FROM readings WHERE id=o.reading_id;
 RETURN jsonb_build_object('success',true,'redirectUrl',CASE WHEN sid IS NULL THEN '/storage' ELSE '/result/'||sid END);
END $$;
CREATE OR REPLACE FUNCTION public.check_attendance(p_user text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u users; today date=(now() AT TIME ZONE 'Asia/Seoul')::date; streak integer; reward integer=0;
BEGIN
 SELECT * INTO u FROM users WHERE id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'account missing'; END IF;
 IF u.last_visit::date=today THEN RETURN jsonb_build_object('alreadyChecked',true,'streak',u.streak_days,'balance',u.yeobjeun_balance); END IF;
 streak=CASE WHEN u.last_visit::date=today-1 THEN coalesce(u.streak_days,0)+1 ELSE 1 END;
 IF streak%7=0 THEN reward=1; END IF;
 UPDATE users SET last_visit=today,streak_days=streak,yeobjeun_balance=yeobjeun_balance+reward WHERE id=p_user;
 RETURN jsonb_build_object('success',true,'streak',streak,'balance',u.yeobjeun_balance+reward,'reward',reward);
END $$;
-- Provider-confirmed full cancellations reverse unused credit grants, or revoke a legacy unlock.
-- A negative balance records already-spent refunded credits; new generations remain blocked.
CREATE OR REPLACE FUNCTION public.cancel_payment(p_order text,p_key text,p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o commerce_orders; uid text;
BEGIN
 SELECT user_id INTO uid FROM commerce_orders WHERE order_id=p_order;
 PERFORM 1 FROM users WHERE id=uid FOR UPDATE;
 SELECT * INTO o FROM commerce_orders WHERE order_id=p_order FOR UPDATE;
 IF o.order_id IS NULL OR o.payment_key IS DISTINCT FROM p_key OR o.amount<>p_amount THEN RAISE EXCEPTION 'payment mismatch'; END IF;
 IF o.status='canceled' THEN RETURN jsonb_build_object('canceled',true); END IF;
 IF o.status='done' THEN
  IF o.product='unlock' THEN UPDATE readings SET is_paid=false,access_verified=false,share_token=null WHERE id=o.reading_id;
  ELSE UPDATE users SET yeobjeun_balance=yeobjeun_balance-o.coins WHERE id=o.user_id; END IF;
 END IF;
 UPDATE commerce_orders SET status='canceled' WHERE order_id=p_order;
 RETURN jsonb_build_object('canceled',true);
END $$;
REVOKE ALL ON FUNCTION public.cancel_payment(text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_payment(text,text,integer) TO service_role;
-- RPCs are callable ONLY through our service-role server after session checks.
REVOKE ALL ON FUNCTION public.reserve_generation(text,text,text,text,jsonb),public.finish_generation(uuid,uuid,boolean,text,jsonb,jsonb),public.bind_payment(text,text,text),public.complete_payment(text,text,integer),public.check_attendance(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_generation(text,text,text,text,jsonb),public.finish_generation(uuid,uuid,boolean,text,jsonb,jsonb),public.bind_payment(text,text,text),public.complete_payment(text,text,integer),public.check_attendance(text) TO service_role;
COMMIT;
