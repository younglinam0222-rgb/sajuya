-- Apply AFTER supabase-launch-security.sql on a test database first.
-- Historical aggregate balances are deliberately NOT guessed to be refundable paid lots.
BEGIN;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS refunded_amount integer NOT NULL DEFAULT 0 CHECK(refunded_amount>=0);
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS refund_review boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS credit_lots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES users(id),
 order_id text UNIQUE REFERENCES commerce_orders(order_id), kind text NOT NULL CHECK(kind IN ('paid','free','legacy')),
 granted integer NOT NULL CHECK(granted>0), available integer NOT NULL CHECK(available>=0),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(available<=granted)
);
CREATE TABLE IF NOT EXISTS credit_spends (
 attempt uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES generation_jobs(id), lot_id uuid NOT NULL REFERENCES credit_lots(id),
 state text NOT NULL CHECK(state IN ('reserved','consumed','released','refunded')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS refund_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES users(id), order_id text NOT NULL REFERENCES commerce_orders(order_id),
 request_key text NOT NULL, kind text NOT NULL CHECK(kind IN ('unused','failure','content','duplicate','external')),
 job_id uuid REFERENCES generation_jobs(id), reason text NOT NULL DEFAULT '',
 status text NOT NULL CHECK(status IN ('review','queued','processing','uncertain','blocked','succeeded','rejected')),
 coins integer NOT NULL DEFAULT 0 CHECK(coins>=0), amount integer NOT NULL DEFAULT 0 CHECK(amount>=0),
 held integer NOT NULL DEFAULT 0 CHECK(held>=0), lot_id uuid REFERENCES credit_lots(id), spend_attempt uuid,
 review_reason text, decision_note text, actor_id text, transaction_key text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 submitted_at timestamptz, lease_until timestamptz, next_check_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 0,
 UNIQUE(user_id,request_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_refund_per_order ON refund_requests(order_id)
 WHERE status IN ('review','queued','processing','uncertain','blocked');
CREATE TABLE IF NOT EXISTS refund_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, refund_id uuid NOT NULL REFERENCES refund_requests(id),
 event text NOT NULL, actor text, note text, created_at timestamptz NOT NULL DEFAULT now()
);
-- One-time legacy import, including accounts with zero balance (via explicit marker).
CREATE TABLE IF NOT EXISTS refund_wallet_migrations(user_id text PRIMARY KEY REFERENCES users(id));
INSERT INTO credit_lots(user_id,kind,granted,available)
 SELECT id,'legacy',yeobjeun_balance-coalesce((SELECT sum(available) FROM credit_lots WHERE user_id=users.id),0),yeobjeun_balance-coalesce((SELECT sum(available) FROM credit_lots WHERE user_id=users.id),0) FROM users
 WHERE yeobjeun_balance>coalesce((SELECT sum(available) FROM credit_lots WHERE user_id=users.id),0) AND NOT EXISTS(SELECT 1 FROM refund_wallet_migrations m WHERE m.user_id=users.id);
INSERT INTO refund_wallet_migrations SELECT id FROM users ON CONFLICT DO NOTHING;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['credit_lots','credit_spends','refund_requests','refund_events','refund_wallet_migrations'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON %I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT ALL ON %I TO service_role',t);
 END LOOP;
END $$;
GRANT USAGE,SELECT ON SEQUENCE refund_events_id_seq TO service_role;

-- Must be invoked while holding the user row lock. Unknown legacy credits remain review-only.
CREATE OR REPLACE FUNCTION ensure_credit_wallet(p_user text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b integer; a integer; BEGIN
 SELECT yeobjeun_balance INTO b FROM users WHERE id=p_user FOR UPDATE;
 SELECT coalesce(sum(available),0) INTO a FROM credit_lots WHERE user_id=p_user;
 IF b>a THEN INSERT INTO credit_lots(user_id,kind,granted,available) VALUES(p_user,'legacy',b-a,b-a);
 ELSIF a>b THEN RAISE EXCEPTION 'wallet mismatch'; END IF;
END $$;

CREATE OR REPLACE FUNCTION refund_snapshot(p_user text,p_admin boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 RETURN jsonb_build_object('orders',coalesce((SELECT jsonb_agg(row_to_json(q)) FROM (
 SELECT o.order_id,o.product,o.amount,o.coins,o.refunded_amount,o.created_at,coalesce(l.available,0) available,(l.id IS NOT NULL) tracked,
 coalesce((SELECT jsonb_agg(jsonb_build_object('id',j.id,'product',j.product,'status',j.status)) FROM generation_jobs j
 WHERE j.user_id=o.user_id AND (j.id IN(SELECT s.job_id FROM credit_spends s WHERE s.lot_id=l.id) OR j.reading_id=o.reading_id)),'[]'::jsonb) jobs
 FROM commerce_orders o LEFT JOIN credit_lots l ON l.order_id=o.order_id
 WHERE o.user_id=p_user AND o.status IN ('done','canceled') ORDER BY o.created_at DESC LIMIT 100) q),'[]'::jsonb),
 'refunds',coalesce((SELECT jsonb_agg(row_to_json(q)) FROM (
 SELECT id,order_id,user_id,kind,reason,status,amount,coins,review_reason,decision_note,created_at
 FROM refund_requests WHERE p_admin OR user_id=p_user ORDER BY CASE WHEN p_admin AND status IN ('review','blocked','uncertain') THEN 0 ELSE 1 END, CASE WHEN p_admin AND status IN ('review','blocked','uncertain') THEN created_at END ASC, created_at DESC LIMIT 200) q),'[]'::jsonb));
END $$;

-- Queueing and credit reservation use the SAME user lock as generation.
CREATE OR REPLACE FUNCTION prepare_refund(p_id uuid,p_actor text DEFAULT NULL,p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r refund_requests; o commerce_orders; l credit_lots; s credit_spends; j generation_jobs; n integer=0; money integer=0; why text; uid text;
BEGIN
 SELECT user_id INTO uid FROM refund_requests WHERE id=p_id;
 PERFORM 1 FROM users WHERE id=uid FOR UPDATE;
 SELECT * INTO r FROM refund_requests WHERE id=p_id FOR UPDATE;
 IF r.id IS NULL THEN RETURN jsonb_build_object('error','missing'); END IF;
 IF r.status<>'review' THEN RETURN to_jsonb(r); END IF;
 SELECT * INTO o FROM commerce_orders WHERE order_id=r.order_id FOR UPDATE;
 SELECT * INTO l FROM credit_lots WHERE order_id=o.order_id FOR UPDATE;
 IF o.status<>'done' OR o.refund_review THEN why='결제 상태와 기존 취소 기록을 확인해야 합니다.';
 ELSIF l.id IS NULL THEN why='구매 출처를 확정할 수 없는 이전 기록입니다. 결제·사용 증빙 확인이 필요합니다.';
 ELSIF r.kind IN ('unused','duplicate') THEN
  n=l.available;
  IF n=0 THEN why='미사용 유료 엽전이 없습니다. 이미 제공된 항목과 신청 사유를 검토해주세요.'; END IF;
 ELSIF r.kind IN ('failure','content') THEN
  SELECT * INTO j FROM generation_jobs WHERE id=r.job_id AND user_id=r.user_id FOR UPDATE;
  SELECT * INTO s FROM credit_spends WHERE job_id=j.id AND lot_id=l.id ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF j.id IS NULL OR s.attempt IS NULL THEN why='선택한 해석의 결제 출처를 확인할 수 없습니다.';
  ELSIF j.status='failed' AND s.state='released' AND l.available>=1 THEN n=1;
  ELSIF j.status='done' AND s.state='consumed' AND p_actor IS NOT NULL THEN n=1;
  ELSE why='해석 제공 상태와 요청 내용을 검토해야 합니다.'; END IF;
 ELSE why='토스에서 별도로 처리된 취소 내역을 대조해야 합니다.'; END IF;
 IF why IS NULL AND p_actor IS NULL AND r.kind IN ('content','duplicate') THEN why='제공 내용 또는 중복 결제 여부를 확인해주세요.'; END IF;
 IF why IS NULL AND p_actor IS NULL AND (SELECT count(*) FROM refund_requests WHERE user_id=r.user_id AND created_at>now()-interval '24 hours')>3 THEN
  why='짧은 시간에 환불 요청이 반복됐습니다. 정상 이용 여부를 확인해주세요.';
 END IF;
 IF why IS NULL THEN
  money=least(o.amount-o.refunded_amount,ceil(o.amount::numeric*n/greatest(o.coins,1))::integer);
  IF money<=0 THEN why='환불 가능한 결제 잔액을 확인해야 합니다.'; END IF;
 END IF;
 IF why IS NOT NULL THEN
  UPDATE refund_requests SET review_reason=why,updated_at=now() WHERE id=r.id RETURNING * INTO r;
  RETURN to_jsonb(r);
 END IF;
 IF s.state IS DISTINCT FROM 'consumed' THEN
  UPDATE credit_lots SET available=available-n WHERE id=l.id;
  UPDATE users SET yeobjeun_balance=yeobjeun_balance-n WHERE id=r.user_id;
 END IF;
 UPDATE refund_requests SET status='queued',coins=n,amount=money,lot_id=l.id,
 held=CASE WHEN s.state='consumed' THEN 0 ELSE n END,
 spend_attempt=CASE WHEN s.state='consumed' THEN s.attempt ELSE NULL END,
 actor_id=p_actor,decision_note=p_note,review_reason=NULL,updated_at=now(),next_check_at=now() WHERE id=r.id RETURNING * INTO r;
 INSERT INTO refund_events(refund_id,event,actor,note) VALUES(r.id,'queued',p_actor,p_note);
 RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION request_refund(p_user text,p_order text,p_kind text,p_reason text,p_key text,p_job uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r refund_requests; o commerce_orders; BEGIN
 PERFORM 1 FROM users WHERE id=p_user FOR UPDATE;
 SELECT * INTO o FROM commerce_orders WHERE order_id=p_order AND user_id=p_user FOR UPDATE;
 IF o.order_id IS NULL THEN RETURN jsonb_build_object('error','missing'); END IF;
 IF p_kind NOT IN ('unused','failure','content','duplicate') OR length(p_reason)>600 OR length(p_key)>80 THEN RETURN jsonb_build_object('error','input'); END IF;
 IF p_job IS NOT NULL AND NOT EXISTS(SELECT 1 FROM generation_jobs WHERE id=p_job AND user_id=p_user) THEN RETURN jsonb_build_object('error','missing'); END IF;
 SELECT * INTO r FROM refund_requests WHERE user_id=p_user AND request_key=p_key;
 IF r.id IS NOT NULL THEN
  IF r.order_id<>p_order OR r.kind<>p_kind OR r.job_id IS DISTINCT FROM p_job THEN RETURN jsonb_build_object('error','conflict'); END IF;
  RETURN to_jsonb(r);
 END IF;
 SELECT * INTO r FROM refund_requests WHERE order_id=p_order AND status IN ('review','queued','processing','uncertain','blocked');
 IF r.id IS NOT NULL THEN RETURN to_jsonb(r); END IF;
 INSERT INTO refund_requests(user_id,order_id,kind,reason,request_key,job_id,status)
 VALUES(p_user,p_order,p_kind,p_reason,p_key,p_job,'review') RETURNING * INTO r;
 INSERT INTO refund_events(refund_id,event,actor) VALUES(r.id,'requested',p_user);
 RETURN prepare_refund(r.id);
END $$;

CREATE OR REPLACE FUNCTION refund_review_quote(p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r refund_requests; o commerce_orders; l credit_lots; s credit_spends; n integer=0; money integer=0; js text; uid text; BEGIN
 SELECT user_id INTO uid FROM refund_requests WHERE id=p_id;
 PERFORM 1 FROM users WHERE id=uid FOR UPDATE;
 SELECT * INTO r FROM refund_requests WHERE id=p_id;
 SELECT * INTO o FROM commerce_orders WHERE order_id=r.order_id;
 SELECT * INTO l FROM credit_lots WHERE order_id=r.order_id;
 IF r.status='review' AND o.status='done' AND NOT o.refund_review AND l.id IS NOT NULL THEN
  IF r.kind IN ('unused','duplicate') THEN n=l.available;
  ELSE
   SELECT status INTO js FROM generation_jobs WHERE id=r.job_id;
   SELECT * INTO s FROM credit_spends WHERE job_id=r.job_id AND lot_id=l.id ORDER BY created_at DESC LIMIT 1;
   IF (js='done' AND s.state='consumed') OR (js='failed' AND s.state='released' AND l.available>=1) THEN n=1; END IF;
  END IF;
 END IF;
 money=least(coalesce(o.amount-o.refunded_amount,0),ceil(coalesce(o.amount,0)::numeric*n/greatest(coalesce(o.coins,0),1))::integer);
 RETURN jsonb_build_object('eligible',money>0,'amount',money,'coins',n,'paid',o.amount,'available',coalesce(l.available,0),'jobStatus',js,'message',CASE WHEN money>0 THEN '해당 금액으로 취소 요청이 전송됩니다.' ELSE '자동 정산이 불가능합니다. 결제·사용 증빙 또는 외부 취소 내역을 확인해주세요.' END);
END $$;

CREATE OR REPLACE FUNCTION decide_refund(p_id uuid,p_actor text,p_approve boolean,p_note text,p_expected_amount integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r refund_requests; uid text; q jsonb; BEGIN
 IF length(trim(p_note))<1 OR length(p_note)>600 THEN RETURN jsonb_build_object('error','input'); END IF;
 SELECT user_id INTO uid FROM refund_requests WHERE id=p_id;
 PERFORM 1 FROM users WHERE id=uid FOR UPDATE;
 SELECT * INTO r FROM refund_requests WHERE id=p_id FOR UPDATE;
 IF r.id IS NULL THEN RETURN jsonb_build_object('error','missing'); END IF;
 IF r.status<>'review' THEN RETURN to_jsonb(r); END IF;
 IF p_approve THEN
  q=refund_review_quote(p_id);
  IF NOT (q->>'eligible')::boolean OR p_expected_amount IS DISTINCT FROM (q->>'amount')::integer THEN RETURN jsonb_build_object('error','quote_changed'); END IF;
  RETURN prepare_refund(p_id,p_actor,p_note);
 END IF;
 UPDATE refund_requests SET status='rejected',decision_note=p_note,actor_id=p_actor,updated_at=now() WHERE id=p_id RETURNING * INTO r;
 INSERT INTO refund_events(refund_id,event,actor,note) VALUES(p_id,'rejected',p_actor,p_note);
 RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION claim_refund(p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r refund_requests; BEGIN
 SELECT * INTO r FROM refund_requests WHERE id=p_id FOR UPDATE;
 IF r.status NOT IN ('queued','processing','uncertain','blocked') OR r.lease_until>now() THEN RETURN NULL; END IF;
 UPDATE refund_requests SET lease_until=now()+interval '90 seconds',attempts=attempts+1,updated_at=now() WHERE id=p_id RETURNING * INTO r;
 RETURN to_jsonb(r);
END $$;
CREATE OR REPLACE FUNCTION mark_refund(p_id uuid,p_state text,p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF p_state NOT IN ('processing','uncertain','blocked') THEN RAISE EXCEPTION 'state'; END IF;
 UPDATE refund_requests SET status=p_state,review_reason=p_note,
 submitted_at=CASE WHEN p_state='processing' THEN coalesce(submitted_at,now()) ELSE submitted_at END,
 lease_until=CASE WHEN p_state='processing' THEN lease_until ELSE NULL END,
 next_check_at=now()+CASE WHEN p_state='blocked' THEN interval '1 hour' ELSE interval '1 minute' END,updated_at=now()
 WHERE id=p_id AND status IN ('queued','processing','uncertain','blocked');
END $$;
CREATE OR REPLACE FUNCTION settle_refund(p_id uuid,p_transaction text,p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r refund_requests; o commerce_orders; s credit_spends; uid text; BEGIN
 SELECT user_id INTO uid FROM refund_requests WHERE id=p_id;
 PERFORM 1 FROM users WHERE id=uid FOR UPDATE;
 SELECT * INTO r FROM refund_requests WHERE id=p_id FOR UPDATE;
 IF r.status='succeeded' THEN
  IF r.transaction_key<>p_transaction THEN RAISE EXCEPTION 'transaction mismatch'; END IF;
  RETURN to_jsonb(r);
 END IF;
 SELECT * INTO o FROM commerce_orders WHERE order_id=r.order_id FOR UPDATE;
 IF r.status NOT IN ('queued','processing','uncertain','blocked') OR p_amount<>r.amount OR p_amount<=0 OR o.refunded_amount+p_amount>o.amount THEN RAISE EXCEPTION 'refund mismatch'; END IF;
 IF r.spend_attempt IS NOT NULL THEN
  SELECT * INTO s FROM credit_spends WHERE attempt=r.spend_attempt FOR UPDATE;
  IF s.state<>'consumed' THEN RAISE EXCEPTION 'spend mismatch'; END IF;
  UPDATE credit_spends SET state='refunded' WHERE attempt=s.attempt;
  UPDATE readings SET access_verified=false,is_paid=false,share_token=NULL WHERE id=(SELECT reading_id FROM generation_jobs WHERE id=s.job_id);
  UPDATE generation_jobs SET status='refunded',response=NULL,updated_at=now() WHERE id=s.job_id;
 END IF;
 UPDATE commerce_orders SET refunded_amount=refunded_amount+p_amount,
 status=CASE WHEN refunded_amount+p_amount=amount THEN 'canceled' ELSE status END WHERE order_id=o.order_id;
 UPDATE refund_requests SET status='succeeded',transaction_key=p_transaction,held=0,lease_until=NULL,review_reason=NULL,updated_at=now() WHERE id=p_id RETURNING * INTO r;
 INSERT INTO refund_events(refund_id,event,actor,note) VALUES(p_id,'succeeded',r.actor_id,p_transaction);
 RETURN to_jsonb(r);
END $$;
-- A provider-completed cancellation may precede our own reservation. Only an exact
-- purchase-lot allocation can be attached here; spent or ambiguous amounts stay in review.
CREATE OR REPLACE FUNCTION external_refund_quote(p_id uuid,p_amount integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r refund_requests; o commerce_orders; l credit_lots; n integer; uid text; BEGIN
 SELECT user_id INTO uid FROM refund_requests WHERE id=p_id;
 PERFORM 1 FROM users WHERE id=uid FOR UPDATE;
 SELECT * INTO r FROM refund_requests WHERE id=p_id;
 SELECT * INTO o FROM commerce_orders WHERE order_id=r.order_id;
 SELECT * INTO l FROM credit_lots WHERE order_id=r.order_id;
 IF r.kind<>'external' OR r.status<>'review' OR r.held<>0 OR r.spend_attempt IS NOT NULL
 OR o.status<>'done' OR l.kind IS DISTINCT FROM 'paid' OR p_amount IS NULL OR p_amount<=0
 OR p_amount>o.amount-o.refunded_amount THEN RETURN jsonb_build_object('eligible',false); END IF;
 SELECT s INTO n FROM generate_series(1,l.available) s
 WHERE least(o.amount-o.refunded_amount,ceil(o.amount::numeric*s/greatest(o.coins,1))::integer)=p_amount
 ORDER BY s LIMIT 1;
 RETURN jsonb_build_object('eligible',n IS NOT NULL,'coins',n,'amount',p_amount);
END $$;
CREATE OR REPLACE FUNCTION settle_external_refund(p_id uuid,p_transaction text,p_amount integer,p_actor text,p_note text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r refund_requests; uid text; result jsonb; q jsonb; l credit_lots; n integer; BEGIN
 IF p_actor IS NULL OR length(trim(p_note))<1 OR length(p_note)>600 THEN RAISE EXCEPTION 'decision required'; END IF;
 SELECT user_id INTO uid FROM refund_requests WHERE id=p_id;
 PERFORM 1 FROM users WHERE id=uid FOR UPDATE;
 SELECT * INTO r FROM refund_requests WHERE id=p_id FOR UPDATE;
 IF r.status='succeeded' AND r.transaction_key=p_transaction AND r.amount=p_amount THEN RETURN to_jsonb(r); END IF;
 IF r.kind='external' AND r.status='review' AND r.held=0 AND r.spend_attempt IS NULL THEN
  q=external_refund_quote(p_id,p_amount);
  IF NOT coalesce((q->>'eligible')::boolean,false) THEN RAISE EXCEPTION 'external amount requires manual allocation'; END IF;
  n=(q->>'coins')::integer;
  SELECT * INTO l FROM credit_lots WHERE order_id=r.order_id FOR UPDATE;
  UPDATE credit_lots SET available=available-n WHERE id=l.id;
  UPDATE users SET yeobjeun_balance=yeobjeun_balance-n WHERE id=r.user_id;
  UPDATE refund_requests SET status='blocked',coins=n,amount=p_amount,held=n,lot_id=l.id
   WHERE id=p_id RETURNING * INTO r;
 END IF;
 IF r.id IS NULL OR r.status NOT IN ('blocked','uncertain','processing') OR (r.held=0 AND r.spend_attempt IS NULL) THEN RAISE EXCEPTION 'request not reserved'; END IF;
 UPDATE refund_requests SET actor_id=p_actor,decision_note=p_note WHERE id=p_id;
 result=settle_refund(p_id,p_transaction,p_amount);
 INSERT INTO refund_events(refund_id,event,actor,note) VALUES(p_id,'external_linked',p_actor,p_note);
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION clear_refund_review(p_order text,p_amount integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 UPDATE commerce_orders SET refund_review=false WHERE order_id=p_order AND refunded_amount=p_amount;
 IF NOT FOUND THEN RAISE EXCEPTION 'refund mismatch'; END IF;
END $$;
CREATE OR REPLACE FUNCTION flag_external_refund(p_order text,p_note text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o commerce_orders; r refund_requests; uid text; BEGIN
 SELECT user_id INTO uid FROM commerce_orders WHERE order_id=p_order;
 PERFORM 1 FROM users WHERE id=uid FOR UPDATE;
 SELECT * INTO o FROM commerce_orders WHERE order_id=p_order FOR UPDATE;
 UPDATE commerce_orders SET refund_review=true WHERE order_id=p_order;
 -- A refunded legacy unlock must not remain publicly readable during review.
 IF o.product='unlock' THEN
  UPDATE readings SET access_verified=false,is_paid=false,share_token=NULL WHERE id=o.reading_id;
 END IF;
 SELECT * INTO r FROM refund_requests WHERE order_id=p_order AND status IN ('review','queued','processing','uncertain','blocked') FOR UPDATE;
 IF r.id IS NULL THEN
  INSERT INTO refund_requests(user_id,order_id,kind,status,request_key,review_reason) VALUES(o.user_id,p_order,'external','review','external-'||gen_random_uuid(),p_note);
 ELSE UPDATE refund_requests SET status=CASE WHEN submitted_at IS NULL AND held=0 THEN 'review' ELSE 'blocked' END,review_reason=p_note,lease_until=NULL,updated_at=now() WHERE id=r.id; END IF;
END $$;

-- Called only after the server independently verifies this historical payment at Toss.
-- This maps one known unlock purchase; it never converts an aggregate wallet into paid credit.
CREATE OR REPLACE FUNCTION register_legacy_payment(p_order text,p_key text,p_amount integer,p_share text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p payments; r readings; o commerce_orders; BEGIN
 SELECT * INTO p FROM payments WHERE order_id=p_order AND toss_payment_key=p_key AND amount=p_amount AND status='done';
 IF p.id IS NULL OR p_amount<>4900 OR p_share !~ '^[a-f0-9]{8,32}$'
 OR p_order !~ ('^unlock_'||p_share||'_[0-9]+$') THEN RAISE EXCEPTION 'legacy payment mismatch'; END IF;
 PERFORM 1 FROM users WHERE id=p.user_id FOR UPDATE;
 SELECT * INTO r FROM readings WHERE share_id=p_share AND user_id=p.user_id FOR UPDATE;
 IF r.id IS NULL OR (p.reading_id IS NOT NULL AND p.reading_id<>r.id) THEN RAISE EXCEPTION 'legacy reading mismatch'; END IF;
 INSERT INTO commerce_orders(order_id,user_id,product,amount,coins,reading_id,payment_key,consent_version,created_at)
 VALUES(p_order,p.user_id,'unlock',p_amount,0,r.id,p_key,'legacy-provider-verified',p.created_at)
 ON CONFLICT(order_id) DO NOTHING;
 SELECT * INTO o FROM commerce_orders WHERE order_id=p_order;
 IF o.user_id<>p.user_id OR o.product<>'unlock' OR o.reading_id IS DISTINCT FROM r.id
 OR o.payment_key IS DISTINCT FROM p_key OR o.amount<>p_amount THEN RAISE EXCEPTION 'legacy order conflict'; END IF;
END $$;

-- A full provider-confirmed unlock cancellation can revoke access without a credit-lot guess.
-- No cancellation POST is made here; each existing Toss transaction is recorded exactly once.
CREATE OR REPLACE FUNCTION settle_canceled_unlock(p_order text,p_key text,p_amount integer,p_transactions jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o commerce_orders; uid text; c jsonb; seen refund_requests; rid uuid; total bigint; BEGIN
 SELECT user_id INTO uid FROM commerce_orders WHERE order_id=p_order;
 PERFORM 1 FROM users WHERE id=uid FOR UPDATE;
 SELECT * INTO o FROM commerce_orders WHERE order_id=p_order FOR UPDATE;
 IF o.order_id IS NULL OR o.product<>'unlock' OR o.coins<>0 OR o.payment_key IS DISTINCT FROM p_key OR o.amount<>p_amount
 OR jsonb_typeof(p_transactions) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'unlock cancellation mismatch'; END IF;
 IF jsonb_array_length(p_transactions)=0 THEN RAISE EXCEPTION 'cancellation evidence missing'; END IF;
 SELECT sum((v->>'cancelAmount')::integer) INTO total FROM jsonb_array_elements(p_transactions) v;
 IF total IS DISTINCT FROM p_amount::bigint OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_transactions) v
 WHERE v->>'cancelStatus' IS DISTINCT FROM 'DONE' OR coalesce(v->>'transactionKey','')='' OR (v->>'cancelAmount')::integer<=0)
 OR (SELECT count(DISTINCT v->>'transactionKey') FROM jsonb_array_elements(p_transactions) v)<>jsonb_array_length(p_transactions)
 THEN RAISE EXCEPTION 'cancellation evidence mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM refund_requests WHERE order_id=p_order AND status IN ('review','queued','processing','uncertain','blocked') AND (held>0 OR spend_attempt IS NOT NULL))
 THEN RAISE EXCEPTION 'unlock reservation mismatch'; END IF;
 UPDATE refund_requests SET status='rejected',review_reason='토스 전체 취소 내역으로 별도 정산되었습니다.',lease_until=NULL,updated_at=now()
 WHERE order_id=p_order AND status IN ('review','queued','processing','uncertain','blocked');
 FOR c IN SELECT value FROM jsonb_array_elements(p_transactions) LOOP
  SELECT * INTO seen FROM refund_requests WHERE transaction_key=c->>'transactionKey';
  IF seen.id IS NOT NULL THEN
   IF seen.order_id<>p_order OR seen.status<>'succeeded' OR seen.amount<>(c->>'cancelAmount')::integer THEN RAISE EXCEPTION 'transaction mismatch'; END IF;
  ELSE
   INSERT INTO refund_requests(user_id,order_id,kind,status,request_key,amount,transaction_key,actor_id)
   VALUES(o.user_id,p_order,'external','succeeded','provider-'||gen_random_uuid(),(c->>'cancelAmount')::integer,c->>'transactionKey','provider-reconcile') RETURNING id INTO rid;
   INSERT INTO refund_events(refund_id,event,actor,note) VALUES(rid,'external_unlock_settled','provider-reconcile',c->>'transactionKey');
  END IF;
 END LOOP;
 UPDATE readings SET access_verified=false,is_paid=false,share_token=NULL WHERE id=o.reading_id;
 UPDATE commerce_orders SET status='canceled',refunded_amount=amount,refund_review=false WHERE order_id=p_order;
END $$;

CREATE OR REPLACE FUNCTION public.reserve_generation(p_user text,p_hash text,p_product text,p_request text,p_input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u users; j generation_jobs; a uuid; linked uuid; stale generation_jobs; lot uuid;
BEGIN
 SELECT * INTO u FROM users WHERE id=p_user FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('error','account'); END IF;
 IF p_product NOT IN ('saju','daily','gunghap','daeun','yearly','taekil') THEN RAISE EXCEPTION 'product'; END IF;
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
 IF j.trial THEN UPDATE users SET daily_trial_used=true WHERE id=j.user_id; END IF;
 UPDATE generation_jobs SET status='done',reading_id=rid,response=p_response,updated_at=now() WHERE id=j.id;
 RETURN jsonb_build_object('shareId',sid);
END $$;
CREATE OR REPLACE FUNCTION public.complete_payment(p_order text,p_key text,p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o commerce_orders; sid text; uid text;
BEGIN
 SELECT user_id INTO uid FROM commerce_orders WHERE order_id=p_order;
 PERFORM 1 FROM users WHERE id=uid FOR UPDATE;
 SELECT * INTO o FROM commerce_orders WHERE order_id=p_order FOR UPDATE;
 IF o.order_id IS NULL OR o.amount<>p_amount OR o.payment_key IS DISTINCT FROM p_key OR p_key IS NULL THEN RAISE EXCEPTION 'payment mismatch'; END IF;
 IF o.refund_review THEN RAISE EXCEPTION 'payment under review'; END IF;
 IF o.status='canceled' THEN RAISE EXCEPTION 'canceled'; END IF;
 IF o.status<>'done' THEN
  IF o.product='unlock' THEN
   UPDATE readings SET is_paid=true,access_verified=true WHERE id=o.reading_id AND user_id=o.user_id RETURNING share_id INTO sid;
   IF sid IS NULL THEN RAISE EXCEPTION 'reading missing'; END IF;
  ELSE
   UPDATE users SET yeobjeun_balance=yeobjeun_balance+o.coins WHERE id=o.user_id;
   INSERT INTO credit_lots(user_id,order_id,kind,granted,available) VALUES(o.user_id,o.order_id,'paid',o.coins,o.coins);
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
 IF reward>0 THEN INSERT INTO credit_lots(user_id,kind,granted,available) VALUES(p_user,'free',reward,reward); END IF;
 RETURN jsonb_build_object('success',true,'streak',streak,'balance',u.yeobjeun_balance+reward,'reward',reward);
END $$;

-- Old full-cancel handler must not subtract credits a second time after this migration.
CREATE OR REPLACE FUNCTION cancel_payment(p_order text,p_key text,p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o commerce_orders; uid text; BEGIN
 IF NOT EXISTS(SELECT 1 FROM commerce_orders WHERE order_id=p_order AND payment_key=p_key AND amount=p_amount) THEN RAISE EXCEPTION 'payment mismatch'; END IF;
 SELECT user_id INTO uid FROM commerce_orders WHERE order_id=p_order;
 PERFORM 1 FROM users WHERE id=uid FOR UPDATE;
 SELECT * INTO o FROM commerce_orders WHERE order_id=p_order FOR UPDATE;
 IF o.product='unlock' THEN
  UPDATE readings SET is_paid=false,access_verified=false,share_token=NULL WHERE id=o.reading_id;
  UPDATE commerce_orders SET status='canceled',refunded_amount=amount,refund_review=false WHERE order_id=p_order;
  RETURN jsonb_build_object('canceled',true);
 END IF;
 PERFORM flag_external_refund(p_order,'토스 취소 내역과 엽전 사용 내역의 대조가 필요합니다.');
 RETURN jsonb_build_object('review',true);
END $$;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('ensure_credit_wallet','refund_snapshot','prepare_refund','request_refund','refund_review_quote','decide_refund','claim_refund','mark_refund','settle_refund','external_refund_quote','settle_external_refund','clear_refund_review','flag_external_refund','register_legacy_payment','settle_canceled_unlock','reserve_generation','finish_generation','complete_payment','check_attendance','cancel_payment') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
COMMIT;
