-- The webhook upserts subscriptions ON CONFLICT (user_id) and the analytics
-- fetcher upserts platform_analytics ON CONFLICT (user_id,platform,post_id),
-- but neither unique constraint existed — every upsert errored ("no unique or
-- exclusion constraint matching the ON CONFLICT specification") and nothing
-- saved. Dedupe, then add the matching unique constraints. Applied to prod.

delete from public.platform_analytics a
using public.platform_analytics b
where a.user_id = b.user_id
  and a.platform = b.platform
  and a.post_id = b.post_id
  and a.post_id is not null
  and a.id < b.id;

alter table public.platform_analytics
  drop constraint if exists platform_analytics_user_platform_post_key;
alter table public.platform_analytics
  add constraint platform_analytics_user_platform_post_key
  unique (user_id, platform, post_id);

delete from public.subscriptions a
using public.subscriptions b
where a.user_id = b.user_id and a.id < b.id;

alter table public.subscriptions
  drop constraint if exists subscriptions_user_id_key;
alter table public.subscriptions
  add constraint subscriptions_user_id_key unique (user_id);
