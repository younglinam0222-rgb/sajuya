-- Apply after supabase-launch-security.sql and supabase-refunds.sql; staging review required.
-- Guided consultation uses the existing refundable 1-coin ledger. Runtime is disabled until approved.
BEGIN;
CREATE OR REPLACE FUNCTION public.reserve_generation(p_user text,p_hash text,p_product text,p_request text,p_input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u users; j generation_jobs; a uuid; linked uuid; stale generation_jobs; lot uuid;
BEGIN
 SELECT * INTO u FROM users WHERE id=p_user FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('error','account'); END IF;
 IF p_product NOT IN ('saju','daily','gunghap','daeun','yearly','taekil','chat') THEN RAISE EXCEPTION 'product'; END IF;
 -- A terminated server cannot leave a reservation charged forever. Max route duration is 300s.
 FOR stale IN SELECT * FROM generation_jobs WHERE user_id=p_user AND status='running' AND updated_at<now()-interval '20 minutes' FOR UPDATE LOOP
  UPDATE credit_lots SET available=available+1 WHERE id=(SELECT lot_id FROM credit_spends WHERE attempt=stale.attempt AND state='reserved');
  UPDATE credit_spends SET state='released' WHERE attempt=stale.attempt AND state='reserved';
  IF NOT stale.trial THEN UPDATE users SET yeobjeun_balance=yeobjeun_balance+1 WHERE id=p_user; END IF;
  UPDATE generation_jobs SET status='failed',updated_at=now() WHERE id=stale.id;
 END LOOP;
 PERFORM ensure_credit_wallet(p_user);
 SELECT * INTO u FROM users WHERE id=p_user;
 SELECT * INTO j FROM generation_jobs WHERE user_id=p_user AND fingerprint=p_hash FOR UPDATE;
 SELECT job_id INTO linked FROM generation_requests WHERE user_id=p_user AND request_id=p_request;
 IF linked IS NOT NULL AND (j.id IS NULL OR linked<>j.id) THEN RETURN jsonb_build_object('error','conflict'); END IF;
 IF j.id IS NOT NULL THEN
  INSERT INTO generation_requests VALUES(p_user,p_request,j.id) ON CONFLICT DO NOTHING;
  IF j.status='refunded' THEN RETURN jsonb_build_object('error','refunded'); END IF;
  IF j.status='done' THEN RETURN jsonb_build_object('cached',true,'response',j.response,'id',j.id); END IF;
  IF j.status='running' THEN RETURN jsonb_build_object('error','busy'); END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM generation_jobs WHERE user_id=p_user AND status='running') THEN RETURN jsonb_build_object('error','busy'); END IF;
 IF (SELECT count(*) FROM generation_attempts WHERE user_id=p_user AND created_at>now()-interval '10 minutes')>=6 THEN RETURN jsonb_build_object('error','rate'); END IF;
 -- Cache replay above remains available even when the daily generation limit is reached.
 IF p_product='chat' AND (SELECT count(*) FROM generation_jobs WHERE user_id=p_user AND product='chat' AND status='done' AND updated_at>=date_trunc('day',now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')>=5 THEN RETURN jsonb_build_object('error','chat_limit'); END IF;
 -- Daily pricing after the one lifetime trial is deliberately not invented here.
 IF p_product='daily' AND u.daily_trial_used THEN RETURN jsonb_build_object('error','trial_used'); END IF;
 IF p_product<>'daily' AND u.yeobjeun_balance<1 THEN RETURN jsonb_build_object('error','balance'); END IF;
 IF p_product<>'daily' THEN
  SELECT l.id INTO lot FROM credit_lots l LEFT JOIN commerce_orders o ON o.order_id=l.order_id
  WHERE l.user_id=p_user AND l.available>0 AND (l.order_id IS NULL OR (o.status='done' AND NOT o.refund_review))
  ORDER BY CASE l.kind WHEN 'free' THEN 0 WHEN 'legacy' THEN 1 ELSE 2 END,l.created_at,l.id LIMIT 1 FOR UPDATE OF l;
  IF lot IS NULL THEN RETURN jsonb_build_object('error','balance'); END IF;
 END IF;
 a=gen_random_uuid();
 IF j.id IS NULL THEN
  INSERT INTO generation_jobs(user_id,fingerprint,product,attempt,trial,input)
   VALUES(p_user,p_hash,p_product,a,p_product='daily',p_input) RETURNING * INTO j;
 ELSE
  UPDATE generation_jobs SET status='running',attempt=a,updated_at=now() WHERE id=j.id RETURNING * INTO j;
 END IF;
 INSERT INTO generation_attempts(id,user_id) VALUES(a,p_user);
 INSERT INTO generation_requests VALUES(p_user,p_request,j.id) ON CONFLICT DO NOTHING;
 IF NOT j.trial THEN
  UPDATE credit_lots SET available=available-1 WHERE id=lot;
  INSERT INTO credit_spends(attempt,job_id,lot_id,state) VALUES(a,j.id,lot,'reserved');
  UPDATE users SET yeobjeun_balance=yeobjeun_balance-1 WHERE id=p_user;
 END IF;
 RETURN jsonb_build_object('id',j.id,'attempt',a);
END $$;
REVOKE ALL ON FUNCTION public.reserve_generation(text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_generation(text,text,text,text,jsonb) TO service_role;
COMMIT;
