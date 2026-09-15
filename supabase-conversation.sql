-- Apply after supabase-chat.sql. Existing wallet/refund behavior retained.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS conversation_trial_used boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.reserve_generation(p_user text,p_hash text,p_product text,p_request text,p_input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u users; j generation_jobs; a uuid; linked uuid; stale generation_jobs; lot uuid; is_trial boolean; previous text;
BEGIN
 SELECT * INTO u FROM users WHERE id=p_user FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('error','account'); END IF;
 IF p_product NOT IN ('saju','daily','gunghap','daeun','yearly','taekil','chat','conversation') THEN RAISE EXCEPTION 'product'; END IF;
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
 IF p_product='conversation' THEN
  IF (SELECT count(*) FROM generation_jobs WHERE user_id=p_user AND product='conversation' AND status='done' AND updated_at>=date_trunc('day',now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')>=10 THEN RETURN jsonb_build_object('error','conversation_limit'); END IF;
  SELECT share_id INTO previous FROM readings WHERE user_id=p_user AND product='conversation' AND access_verified AND saju_data->'form'->'conversation'->>'roomId'=p_input->'conversation'->>'roomId' ORDER BY created_at DESC,id DESC LIMIT 1;
  IF previous IS DISTINCT FROM (p_input->'conversation'->>'previousId') THEN RETURN jsonb_build_object('error','conversation_changed'); END IF;
 END IF;
 is_trial=(p_product='daily' OR (p_product='conversation' AND NOT u.conversation_trial_used));
 IF p_product='conversation' AND NOT is_trial AND (p_input->'conversation'->>'maxCoins') IS DISTINCT FROM '1' THEN RETURN jsonb_build_object('error','price_changed'); END IF;
 -- Daily pricing after the one lifetime trial is deliberately not invented here.
 IF p_product='daily' AND u.daily_trial_used THEN RETURN jsonb_build_object('error','trial_used'); END IF;
 IF NOT is_trial AND u.yeobjeun_balance<1 THEN RETURN jsonb_build_object('error','balance'); END IF;
 IF NOT is_trial THEN
  SELECT l.id INTO lot FROM credit_lots l LEFT JOIN commerce_orders o ON o.order_id=l.order_id
  WHERE l.user_id=p_user AND l.available>0 AND (l.order_id IS NULL OR (o.status='done' AND NOT o.refund_review))
  ORDER BY CASE l.kind WHEN 'free' THEN 0 WHEN 'legacy' THEN 1 ELSE 2 END,l.created_at,l.id LIMIT 1 FOR UPDATE OF l;
  IF lot IS NULL THEN RETURN jsonb_build_object('error','balance'); END IF;
 END IF;
 a=gen_random_uuid();
 IF j.id IS NULL THEN
  INSERT INTO generation_jobs(user_id,fingerprint,product,attempt,trial,input)
   VALUES(p_user,p_hash,p_product,a,is_trial,p_input) RETURNING * INTO j;
 ELSE
  UPDATE generation_jobs SET status='running',trial=is_trial,attempt=a,updated_at=now() WHERE id=j.id RETURNING * INTO j;
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
CREATE OR REPLACE FUNCTION public.finish_generation(p_job uuid,p_attempt uuid,p_success boolean,p_response text DEFAULT NULL,p_result jsonb DEFAULT NULL,p_manse jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j generation_jobs; rid uuid; sid text; uid text;
BEGIN
 SELECT user_id INTO uid FROM generation_jobs WHERE id=p_job;
 PERFORM 1 FROM users WHERE id=uid FOR UPDATE;
 SELECT * INTO j FROM generation_jobs WHERE id=p_job FOR UPDATE;
 IF j.id IS NULL OR j.attempt IS DISTINCT FROM p_attempt OR j.status<>'running' THEN RETURN jsonb_build_object('error','stale'); END IF;
 IF NOT p_success THEN
  UPDATE credit_lots SET available=available+1 WHERE id=(SELECT lot_id FROM credit_spends WHERE attempt=p_attempt AND state='reserved');
  UPDATE credit_spends SET state='released' WHERE attempt=p_attempt AND state='reserved';
  IF NOT j.trial THEN UPDATE users SET yeobjeun_balance=yeobjeun_balance+1 WHERE id=j.user_id; END IF;
  UPDATE generation_jobs SET status='failed',updated_at=now() WHERE id=j.id;
  RETURN jsonb_build_object('refunded',true);
 END IF;
 IF p_result IS NULL OR p_response IS NULL THEN RAISE EXCEPTION 'missing result'; END IF;
 UPDATE credit_spends SET state='consumed' WHERE attempt=p_attempt AND state='reserved';
 sid=replace(gen_random_uuid()::text,'-','');
 INSERT INTO readings(share_id,user_id,character_id,occupation_id,saju_data,ai_result,is_paid,access_verified,product)
 VALUES(sid,j.user_id,coalesce(j.input->>'characterId','sinRyeong'),coalesce(j.input->>'occupation','general'),
 jsonb_build_object('form',j.input,'saju',p_manse,'partner',j.input->'partnerInfo'),p_result::text,NOT j.trial,true,j.product) RETURNING id INTO rid;
 IF j.trial AND j.product='daily' THEN UPDATE users SET daily_trial_used=true WHERE id=j.user_id; END IF;
 IF j.trial AND j.product='conversation' THEN UPDATE users SET conversation_trial_used=true WHERE id=j.user_id; END IF;
 UPDATE generation_jobs SET status='done',reading_id=rid,response=p_response,updated_at=now() WHERE id=j.id;
 RETURN jsonb_build_object('shareId',sid);
END $$;
REVOKE ALL ON FUNCTION public.reserve_generation(text,text,text,text,jsonb), public.finish_generation(uuid,uuid,boolean,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_generation(text,text,text,text,jsonb), public.finish_generation(uuid,uuid,boolean,text,jsonb,jsonb) TO service_role;
COMMIT;
