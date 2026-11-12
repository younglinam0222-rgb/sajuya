-- Apply to an isolated Preview database after supabase-restore-saju-free-three.sql.
-- Temporarily grants complete Saju results without debit; existing purchases remain unchanged.
BEGIN;

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
