-- Restore only the server-owned saju generation path on the legacy production schema.
-- Saju generation is temporarily free. This migration does not debit balances,
-- alter payment rows, or grant access to historical results.
BEGIN;

ALTER TABLE public.readings ADD COLUMN IF NOT EXISTS access_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.readings ADD COLUMN IF NOT EXISTS product text NOT NULL DEFAULT 'saju';

-- Production preflight found RLS disabled and anon SELECT granted on these
-- private tables. Current account, payment, and reading routes use the server
-- role and check ownership; block direct browser access before writing more PII.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read readings by share_id" ON public.readings;
REVOKE ALL ON public.users, public.payments, public.readings FROM anon, authenticated;
GRANT ALL ON public.users, public.payments, public.readings TO service_role;

CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.users(id),
  fingerprint text NOT NULL,
  product text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','failed','done')),
  attempt uuid NOT NULL DEFAULT gen_random_uuid(),
  trial boolean NOT NULL DEFAULT true,
  input jsonb NOT NULL,
  response text,
  reading_id uuid REFERENCES public.readings(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fingerprint)
);
CREATE TABLE IF NOT EXISTS public.generation_requests (
  user_id text NOT NULL REFERENCES public.users(id),
  request_id text NOT NULL,
  job_id uuid NOT NULL REFERENCES public.generation_jobs(id),
  PRIMARY KEY (user_id, request_id)
);
CREATE TABLE IF NOT EXISTS public.generation_attempts (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS generation_attempts_rate_idx
  ON public.generation_attempts (user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.generation_jobs(id),
  model text NOT NULL,
  input_tokens integer NOT NULL,
  output_tokens integer NOT NULL,
  cache_read_tokens integer NOT NULL DEFAULT 0,
  cache_creation_tokens integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.generation_jobs, public.generation_requests,
  public.generation_attempts, public.ai_usage FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.generation_jobs, public.generation_requests,
  public.generation_attempts, public.ai_usage TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_generation(
  p_user text, p_hash text, p_product text, p_request text, p_input jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE j public.generation_jobs; linked uuid; a uuid;
BEGIN
  IF p_product <> 'saju' OR p_user IS NULL OR p_hash IS NULL OR p_request IS NULL
     OR p_input IS NULL OR jsonb_typeof(p_input) <> 'object' THEN
    RETURN jsonb_build_object('error','unavailable');
  END IF;
  PERFORM 1 FROM public.users WHERE id=p_user FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','account'); END IF;
  UPDATE public.generation_jobs SET status='failed',updated_at=now()
    WHERE user_id=p_user AND status='running'
      AND updated_at < now()-interval '20 minutes';
  SELECT * INTO j FROM public.generation_jobs
    WHERE user_id=p_user AND fingerprint=p_hash FOR UPDATE;
  SELECT job_id INTO linked FROM public.generation_requests
    WHERE user_id=p_user AND request_id=p_request;
  IF linked IS NOT NULL AND (j.id IS NULL OR linked<>j.id) THEN
    RETURN jsonb_build_object('error','conflict');
  END IF;
  IF j.id IS NOT NULL THEN
    INSERT INTO public.generation_requests(user_id,request_id,job_id)
      VALUES(p_user,p_request,j.id) ON CONFLICT DO NOTHING;
    IF j.status='done' THEN
      RETURN jsonb_build_object('cached',true,'response',j.response,'id',j.id);
    END IF;
    IF j.status='running' THEN RETURN jsonb_build_object('error','busy'); END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM public.generation_jobs
            WHERE user_id=p_user AND status='running') THEN
    RETURN jsonb_build_object('error','busy');
  END IF;
  IF (SELECT count(*) FROM public.generation_attempts
      WHERE user_id=p_user AND created_at>now()-interval '10 minutes') >= 6 THEN
    RETURN jsonb_build_object('error','rate');
  END IF;
  a=gen_random_uuid();
  IF j.id IS NULL THEN
    INSERT INTO public.generation_jobs(user_id,fingerprint,product,attempt,trial,input)
      VALUES(p_user,p_hash,'saju',a,true,p_input) RETURNING * INTO j;
  ELSE
    UPDATE public.generation_jobs SET status='running',attempt=a,updated_at=now()
      WHERE id=j.id RETURNING * INTO j;
  END IF;
  INSERT INTO public.generation_attempts(id,user_id) VALUES(a,p_user);
  INSERT INTO public.generation_requests(user_id,request_id,job_id)
    VALUES(p_user,p_request,j.id) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('id',j.id,'attempt',a);
END $$;

CREATE OR REPLACE FUNCTION public.finish_generation(
  p_job uuid, p_attempt uuid, p_success boolean,
  p_response text DEFAULT NULL, p_result jsonb DEFAULT NULL, p_manse jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE j public.generation_jobs; rid uuid; sid text; uid text;
BEGIN
  SELECT user_id INTO uid FROM public.generation_jobs WHERE id=p_job;
  PERFORM 1 FROM public.users WHERE id=uid FOR UPDATE;
  SELECT * INTO j FROM public.generation_jobs WHERE id=p_job FOR UPDATE;
  IF j.id IS NULL OR j.attempt IS DISTINCT FROM p_attempt
     OR j.status<>'running' OR j.product<>'saju' THEN
    RETURN jsonb_build_object('error','stale');
  END IF;
  IF NOT p_success THEN
    UPDATE public.generation_jobs SET status='failed',updated_at=now() WHERE id=j.id;
    RETURN jsonb_build_object('released',true);
  END IF;
  IF p_result IS NULL OR p_response IS NULL OR p_manse IS NULL THEN
    RAISE EXCEPTION 'missing result';
  END IF;
  sid=replace(gen_random_uuid()::text,'-','');
  INSERT INTO public.readings(
    share_id,user_id,character_id,occupation_id,saju_data,ai_result,
    is_paid,access_verified,product
  ) VALUES (
    sid,j.user_id,coalesce(j.input->>'characterId','sinRyeong'),
    coalesce(j.input->>'occupation','general'),
    jsonb_build_object('form',j.input,'saju',p_manse,'partner',j.input->'partnerInfo'),
    p_result::text,false,true,'saju'
  ) RETURNING id INTO rid;
  UPDATE public.generation_jobs
    SET status='done',reading_id=rid,response=p_response,updated_at=now()
    WHERE id=j.id;
  RETURN jsonb_build_object('shareId',sid);
END $$;

REVOKE ALL ON FUNCTION public.reserve_generation(text,text,text,text,jsonb),
  public.finish_generation(uuid,uuid,boolean,text,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_generation(text,text,text,text,jsonb),
  public.finish_generation(uuid,uuid,boolean,text,jsonb,jsonb) TO service_role;
COMMIT;
