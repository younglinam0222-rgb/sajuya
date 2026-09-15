-- Apply after supabase-conversation.sql. NextAuth identities reach these RPCs
-- only through authenticated server routes. Never grant client roles access.
BEGIN;
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 400 AND body=btrim(body)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_created_idx ON public.reviews(created_at DESC,id DESC);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reviews FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.reviews TO service_role;
CREATE TABLE IF NOT EXISTS public.review_write_limits (
 user_id text PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
 last_written timestamptz NOT NULL
);
ALTER TABLE public.review_write_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_write_limits FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.review_write_limits TO service_role;

CREATE OR REPLACE FUNCTION public.list_public_reviews(p_before_time timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL,p_limit integer DEFAULT 12)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF p_limit IS NULL OR p_limit<1 OR p_limit>20 OR ((p_before_time IS NULL)<>(p_before_id IS NULL)) THEN RAISE EXCEPTION 'invalid page'; END IF;
 WITH page AS (
  SELECT id,rating,body,created_at,updated_at FROM public.reviews
  WHERE p_before_time IS NULL OR (created_at,id)<(p_before_time,p_before_id)
  ORDER BY created_at DESC,id DESC LIMIT p_limit+1
 ), numbered AS (SELECT *,row_number() OVER(ORDER BY created_at DESC,id DESC) AS n FROM page)
 SELECT jsonb_build_object('items',COALESCE(jsonb_agg(jsonb_build_object('id',id,'rating',rating,'body',body,'created_at',created_at,'updated_at',updated_at) ORDER BY created_at DESC,id DESC) FILTER(WHERE n<=p_limit),'[]'::jsonb),'hasMore',count(*)>p_limit) INTO result FROM numbered;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.my_review_status(p_user text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object(
 'eligible',EXISTS(SELECT 1 FROM public.reviews WHERE user_id=p_user) OR EXISTS(SELECT 1 FROM public.readings WHERE user_id=p_user AND access_verified=true AND ai_result IS NOT NULL AND length(ai_result)>0),
 'review',(SELECT jsonb_build_object('id',id,'rating',rating,'body',body,'created_at',created_at,'updated_at',updated_at) FROM public.reviews WHERE user_id=p_user));
$$;

CREATE OR REPLACE FUNCTION public.save_my_review(p_user text,p_rating integer,p_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE previous public.reviews; saved public.reviews;
BEGIN
 IF p_rating IS NULL OR p_rating<1 OR p_rating>5 OR p_body IS NULL OR char_length(btrim(p_body))<1 OR char_length(p_body)>400 OR p_body<>btrim(p_body) THEN RAISE EXCEPTION 'invalid review'; END IF;
 PERFORM 1 FROM public.users WHERE id=p_user FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('error','ineligible'); END IF;
 SELECT * INTO previous FROM public.reviews WHERE user_id=p_user;
 -- Identical retry has no extra writes and keeps the original timestamps.
 IF previous.id IS NOT NULL AND previous.rating=p_rating AND previous.body=p_body THEN
  RETURN jsonb_build_object('review',jsonb_build_object('id',previous.id,'rating',previous.rating,'body',previous.body,'created_at',previous.created_at,'updated_at',previous.updated_at));
 END IF;
 -- A later refund must not prevent an existing reviewer from editing criticism.
 IF previous.id IS NULL AND NOT EXISTS(SELECT 1 FROM public.readings WHERE user_id=p_user AND access_verified=true AND ai_result IS NOT NULL AND length(ai_result)>0) THEN RETURN jsonb_build_object('error','ineligible'); END IF;
 IF EXISTS(SELECT 1 FROM public.review_write_limits WHERE user_id=p_user AND last_written>now()-interval '10 seconds') THEN RETURN jsonb_build_object('error','rate_limited'); END IF;
 INSERT INTO public.reviews(user_id,rating,body) VALUES(p_user,p_rating,p_body)
 ON CONFLICT(user_id) DO UPDATE SET rating=excluded.rating,body=excluded.body,updated_at=now()
 RETURNING * INTO saved;
 INSERT INTO public.review_write_limits(user_id,last_written) VALUES(p_user,now()) ON CONFLICT(user_id) DO UPDATE SET last_written=excluded.last_written;
 RETURN jsonb_build_object('review',jsonb_build_object('id',saved.id,'rating',saved.rating,'body',saved.body,'created_at',saved.created_at,'updated_at',saved.updated_at));
END $$;

CREATE OR REPLACE FUNCTION public.delete_my_review(p_user text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM 1 FROM public.users WHERE id=p_user FOR UPDATE;
 DELETE FROM public.reviews WHERE user_id=p_user;
 RETURN jsonb_build_object('deleted',true);
END $$;
REVOKE ALL ON FUNCTION public.list_public_reviews(timestamptz,uuid,integer),public.my_review_status(text),public.save_my_review(text,integer,text),public.delete_my_review(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_reviews(timestamptz,uuid,integer),public.my_review_status(text),public.save_my_review(text,integer,text),public.delete_my_review(text) TO service_role;
COMMIT;
