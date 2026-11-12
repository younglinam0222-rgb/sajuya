-- Apply to an isolated Preview database after supabase-restore-saju-free-three.sql.
-- Temporarily grants complete Saju results without debit; existing purchases remain unchanged.
BEGIN;

CREATE TABLE IF NOT EXISTS public.guest_generation_quota (
  ip_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts BETWEEN 1 AND 3),
  PRIMARY KEY (ip_hash, window_start)
);
CREATE INDEX IF NOT EXISTS guest_generation_quota_window_idx ON public.guest_generation_quota(window_start);
ALTER TABLE public.guest_generation_quota ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guest_generation_quota FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_guest_generation(p_ip_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer; window_at timestamptz;
BEGIN
  IF p_ip_hash !~ '^[0-9a-f]{64}$' THEN RETURN jsonb_build_object('error','rate'); END IF;
  DELETE FROM guest_generation_quota WHERE window_start < now() - interval '1 day';
  window_at = to_timestamp(floor(extract(epoch FROM now()) / 600) * 600);
  INSERT INTO guest_generation_quota(ip_hash, window_start, attempts)
    VALUES(p_ip_hash, window_at, 1)
    ON CONFLICT(ip_hash,window_start) DO UPDATE
      SET attempts = guest_generation_quota.attempts + 1
      WHERE guest_generation_quota.attempts < 3
    RETURNING attempts INTO n;
  IF n IS NULL THEN RETURN jsonb_build_object('error','rate'); END IF;
  RETURN jsonb_build_object('attempts',n);
END $$;
REVOKE ALL ON FUNCTION public.reserve_guest_generation(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_guest_generation(text) TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_saju_free(
  p_user text, p_hash text, p_request text, p_input jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j generation_jobs; a uuid; linked uuid;
BEGIN
  IF p_user ~ '^guest-[0-9a-f]{32}$' THEN
    INSERT INTO users(id,yeobjeun_balance) VALUES(p_user,0) ON CONFLICT(id) DO NOTHING;
  END IF;
  -- Serialize all generation reservations for this account with the existing wallet RPC.
  PERFORM 1 FROM users WHERE id = p_user FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'account'); END IF;

  SELECT job_id INTO linked FROM generation_requests
  WHERE user_id = p_user AND request_id = p_request;
  SELECT * INTO j FROM generation_jobs
  WHERE user_id = p_user AND fingerprint = p_hash FOR UPDATE;
  IF linked IS NOT NULL AND (j.id IS NULL OR linked <> j.id) THEN
    RETURN jsonb_build_object('error', 'conflict');
  END IF;
  IF j.id IS NOT NULL THEN
    IF NOT j.trial OR j.product <> 'saju' THEN RETURN jsonb_build_object('error', 'conflict'); END IF;
    INSERT INTO generation_requests(user_id, request_id, job_id)
      VALUES(p_user, p_request, j.id) ON CONFLICT DO NOTHING;
    IF j.status = 'done' THEN
      RETURN jsonb_build_object('cached', true, 'response', j.response, 'id', j.id);
    END IF;
    IF j.status = 'running' AND j.updated_at >= now() - interval '20 minutes' THEN
      RETURN jsonb_build_object('error', 'busy');
    END IF;
    IF j.status = 'refunded' THEN RETURN jsonb_build_object('error', 'refunded'); END IF;
  END IF;

  -- A dead free job may be retried. A paid job remains under its existing recovery path.
  IF EXISTS(SELECT 1 FROM generation_jobs WHERE user_id = p_user AND status = 'running'
    AND (trial = false OR updated_at >= now() - interval '20 minutes')) THEN
    RETURN jsonb_build_object('error', 'busy');
  END IF;
  UPDATE generation_jobs SET status = 'failed', updated_at = now()
  WHERE user_id = p_user AND status = 'running' AND trial = true
    AND updated_at < now() - interval '20 minutes';
  IF (SELECT count(*) FROM generation_attempts
      WHERE user_id = p_user AND created_at > now() - interval '10 minutes') >= 6 THEN
    RETURN jsonb_build_object('error', 'rate');
  END IF;

  a = gen_random_uuid();
  IF j.id IS NULL THEN
    INSERT INTO generation_jobs(user_id, fingerprint, product, attempt, trial, input)
      VALUES(p_user, p_hash, 'saju', a, true, p_input) RETURNING * INTO j;
  ELSE
    UPDATE generation_jobs SET status = 'running', attempt = a, updated_at = now()
      WHERE id = j.id RETURNING * INTO j;
  END IF;
  INSERT INTO generation_attempts(id, user_id) VALUES(a, p_user);
  INSERT INTO generation_requests(user_id, request_id, job_id)
    VALUES(p_user, p_request, j.id) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('id', j.id, 'attempt', a);
END $$;

REVOKE ALL ON FUNCTION public.reserve_saju_free(text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_saju_free(text,text,text,jsonb) TO service_role;

-- Keep daily and conversation trial accounting separate from free Saju previews.
CREATE OR REPLACE FUNCTION public.finish_generation(
  p_job uuid, p_attempt uuid, p_success boolean,
  p_response text DEFAULT NULL, p_result jsonb DEFAULT NULL, p_manse jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j generation_jobs; rid uuid; sid text; uid text;
BEGIN
  SELECT user_id INTO uid FROM generation_jobs WHERE id = p_job;
  PERFORM 1 FROM users WHERE id = uid FOR UPDATE;
  SELECT * INTO j FROM generation_jobs WHERE id = p_job FOR UPDATE;
  IF j.id IS NULL OR j.attempt IS DISTINCT FROM p_attempt OR j.status <> 'running' THEN
    RETURN jsonb_build_object('error', 'stale');
  END IF;
  IF NOT p_success THEN
    UPDATE credit_lots SET available = available + 1
      WHERE id = (SELECT lot_id FROM credit_spends WHERE attempt = p_attempt AND state = 'reserved');
    UPDATE credit_spends SET state = 'released' WHERE attempt = p_attempt AND state = 'reserved';
    IF NOT j.trial THEN UPDATE users SET yeobjeun_balance = yeobjeun_balance + 1 WHERE id = j.user_id; END IF;
    UPDATE generation_jobs SET status = 'failed', updated_at = now() WHERE id = j.id;
    RETURN jsonb_build_object('refunded', true);
  END IF;
  IF p_result IS NULL OR p_response IS NULL THEN RAISE EXCEPTION 'missing result'; END IF;
  IF j.product = 'saju' AND j.trial THEN
    IF p_result #>> '{_meta,accessScope}' IS DISTINCT FROM 'free_full_v1'
      OR jsonb_typeof(p_result->'titles') IS DISTINCT FROM 'array'
      OR jsonb_array_length(p_result->'titles') <> 12
      OR (SELECT count(DISTINCT t->>'id') FROM jsonb_array_elements(p_result->'titles') t
          WHERE t->>'id' = ANY(ARRAY['1','2','3','4','5','6','7','8','9','10','11','12'])) <> 12
      OR jsonb_typeof(p_result->'strategy') IS DISTINCT FROM 'object'
      OR (coalesce(j.input->>'personalQuestion','') <> '' AND
          coalesce(p_result #>> '{personalAnswer,answer}','') = '') THEN
      RAISE EXCEPTION 'invalid full free saju result';
    END IF;
  END IF;
  UPDATE credit_spends SET state = 'consumed' WHERE attempt = p_attempt AND state = 'reserved';
  sid = replace(gen_random_uuid()::text, '-', '');
  INSERT INTO readings(share_id,user_id,character_id,occupation_id,saju_data,ai_result,is_paid,access_verified,product)
    VALUES(sid,j.user_id,coalesce(j.input->>'characterId','sinRyeong'),coalesce(j.input->>'occupation','general'),
      jsonb_build_object('form',j.input,'saju',p_manse,'partner',j.input->'partnerInfo'),
      p_result::text,NOT j.trial,true,j.product) RETURNING id INTO rid;
  IF j.trial AND j.product = 'daily' THEN UPDATE users SET daily_trial_used = true WHERE id = j.user_id; END IF;
  IF j.trial AND j.product = 'conversation' THEN UPDATE users SET conversation_trial_used = true WHERE id = j.user_id; END IF;
  UPDATE generation_jobs SET status = 'done', reading_id = rid, response = p_response, updated_at = now() WHERE id = j.id;
  RETURN jsonb_build_object('shareId', sid);
END $$;

REVOKE ALL ON FUNCTION public.finish_generation(uuid,uuid,boolean,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_generation(uuid,uuid,boolean,text,jsonb,jsonb) TO service_role;
COMMIT;
