-- SELVA+ production hardening: counters, privacy, missing indexes and safe authorization helpers.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
  safe_username text;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', ''), '[^a-z0-9_]', '', 'g'));
  if char_length(base_username) < 3 then
    base_username := 'aventureiro';
  end if;
  base_username := left(base_username, 21);
  safe_username := base_username;
  if exists (select 1 from public.profiles where username = safe_username) then
    safe_username := base_username || '_' || substr(new.id::text, 1, 8);
  end if;

  insert into public.profiles (id, username, full_name, city, state)
  values (
    new.id,
    safe_username,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Novo aventureiro'),
    nullif(trim(new.raw_user_meta_data->>'city'), ''),
    nullif(upper(trim(new.raw_user_meta_data->>'state')), '')
  );
  insert into public.user_statistics (user_id) values (new.id);
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated, service_role;
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.is_group_staff(target_group_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group_id
      and user_id = (select auth.uid())
      and role = any(allowed_roles)
  );
$$;
revoke all on function private.is_group_staff(uuid, text[]) from public, anon, service_role;
grant execute on function private.is_group_staff(uuid, text[]) to authenticated;

drop policy if exists "group staff update groups" on public.groups;
create policy "group staff update groups" on public.groups for update to authenticated
using (private.is_group_staff(id, array['owner','admin']))
with check (private.is_group_staff(id, array['owner','admin']));

drop policy if exists "members leave groups" on public.group_members;
drop policy if exists "users join groups" on public.group_members;
create policy "users join groups" on public.group_members for insert to authenticated
with check (user_id = (select auth.uid()) and role = 'member');
create policy "members leave or staff remove members" on public.group_members for delete to authenticated
using (user_id = (select auth.uid()) or private.is_group_staff(group_id, array['owner','admin','moderator']));
create policy "staff update member roles" on public.group_members for update to authenticated
using (private.is_group_staff(group_id, array['owner','admin']))
with check (private.is_group_staff(group_id, array['owner','admin']) and role in ('admin','moderator','member'));

drop policy if exists "activity points follow activity visibility" on public.activity_points;
drop policy if exists "owners read precise activity points" on public.activity_points;
create policy "owners read precise activity points" on public.activity_points for select to authenticated using (
  exists (
    select 1 from public.activities a
    where a.id = activity_id and a.user_id = (select auth.uid())
  )
);

drop policy if exists "comments on visible posts readable" on public.comments;
create policy "comments on visible posts readable" on public.comments for select using (
  exists (
    select 1 from public.posts p
    where p.id = post_id and (
      p.user_id = (select auth.uid())
      or p.visibility = 'public'
      or (p.visibility = 'followers' and exists (
        select 1 from public.follows f
        where f.follower_id = (select auth.uid()) and f.following_id = p.user_id
      ))
    )
  )
);

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','trails','activities','trail_reviews','posts','groups','group_posts'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name);
  end loop;
end;
$$;

create or replace function private.refresh_user_statistics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare affected_user_id uuid;
begin
  affected_user_id := coalesce(new.user_id, old.user_id);
  insert into public.user_statistics (
    user_id, activity_count, total_distance_m, total_duration_seconds, total_elevation_gain_m, trails_completed, updated_at
  )
  select
    affected_user_id,
    count(*)::integer,
    coalesce(sum(distance_m), 0),
    coalesce(sum(duration_seconds), 0)::bigint,
    coalesce(sum(elevation_gain_m), 0),
    count(distinct trail_id) filter (where trail_id is not null)::integer,
    now()
  from public.activities
  where user_id = affected_user_id
  on conflict (user_id) do update set
    activity_count = excluded.activity_count,
    total_distance_m = excluded.total_distance_m,
    total_duration_seconds = excluded.total_duration_seconds,
    total_elevation_gain_m = excluded.total_elevation_gain_m,
    trails_completed = excluded.trails_completed,
    updated_at = excluded.updated_at;
  return coalesce(new, old);
end;
$$;
revoke all on function private.refresh_user_statistics() from public, anon, authenticated;
drop trigger if exists refresh_user_statistics on public.activities;
create trigger refresh_user_statistics after insert or update or delete on public.activities
for each row execute function private.refresh_user_statistics();

create or replace function private.initialize_group_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.group_members (group_id, user_id, role) values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;
revoke all on function private.initialize_group_owner() from public, anon, authenticated;
drop trigger if exists initialize_group_owner on public.groups;
create trigger initialize_group_owner after insert on public.groups for each row execute function private.initialize_group_owner();

create or replace function private.refresh_group_member_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.groups set member_count = (
    select count(*) from public.group_members where group_id = coalesce(new.group_id, old.group_id)
  ) where id = coalesce(new.group_id, old.group_id);
  return coalesce(new, old);
end;
$$;
revoke all on function private.refresh_group_member_count() from public, anon, authenticated;
drop trigger if exists refresh_group_member_count on public.group_members;
create trigger refresh_group_member_count after insert or delete on public.group_members
for each row execute function private.refresh_group_member_count();

create or replace function private.refresh_report_confirmation_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.environment_reports
  set confirmation_count = (select count(*) from public.report_confirmations where report_id = coalesce(new.report_id, old.report_id)),
      status = case
        when status = 'reported' and (select count(*) from public.report_confirmations where report_id = coalesce(new.report_id, old.report_id)) >= 3 then 'confirmed'
        else status
      end
  where id = coalesce(new.report_id, old.report_id);
  return coalesce(new, old);
end;
$$;
revoke all on function private.refresh_report_confirmation_count() from public, anon, authenticated;
drop trigger if exists refresh_report_confirmation_count on public.report_confirmations;
create trigger refresh_report_confirmation_count after insert or delete on public.report_confirmations
for each row execute function private.refresh_report_confirmation_count();

-- All media remains private. Signed URLs are issued only after object RLS succeeds.
update storage.buckets set public = false
where id in ('avatars','covers','activity-photos','trail-photos','group-images','environment-reports');
drop policy if exists "public media readable" on storage.objects;
drop policy if exists "community media readable" on storage.objects;
create policy "community media readable" on storage.objects for select to anon, authenticated
using (bucket_id in ('avatars','covers','trail-photos','group-images','environment-reports'));
create policy "visible activity media readable" on storage.objects for select using (
  bucket_id = 'activity-photos'
  and split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (
    select 1 from public.activities a
    where a.id = split_part(name, '/', 2)::uuid and (
      a.user_id = (select auth.uid())
      or a.visibility = 'public'
      or (a.visibility = 'followers' and exists (
        select 1 from public.follows f
        where f.follower_id = (select auth.uid()) and f.following_id = a.user_id
      ))
    )
  )
);

-- Foreign-key indexes used by feed, moderation and ownership checks.
create index if not exists activity_photos_user_idx on public.activity_photos (user_id);
create index if not exists trail_photos_user_idx on public.trail_photos (user_id);
create index if not exists trail_reviews_user_idx on public.trail_reviews (user_id);
create index if not exists trail_conditions_user_idx on public.trail_conditions (user_id);
create index if not exists posts_activity_idx on public.posts (activity_id) where activity_id is not null;
create index if not exists post_photos_user_idx on public.post_photos (user_id);
create index if not exists likes_post_idx on public.likes (post_id, created_at desc);
create index if not exists comments_user_idx on public.comments (user_id);
create index if not exists comments_parent_idx on public.comments (parent_id) where parent_id is not null;
create index if not exists groups_owner_idx on public.groups (owner_id);
create index if not exists group_posts_user_idx on public.group_posts (user_id);
create index if not exists group_posts_activity_idx on public.group_posts (activity_id) where activity_id is not null;
create index if not exists events_creator_idx on public.events (creator_id);
create index if not exists event_participants_user_idx on public.event_participants (user_id);
create index if not exists environment_reports_user_idx on public.environment_reports (user_id, created_at desc);
create index if not exists report_confirmations_user_idx on public.report_confirmations (user_id);
create index if not exists user_achievements_achievement_idx on public.user_achievements (achievement_id);
create index if not exists notifications_actor_idx on public.notifications (actor_id) where actor_id is not null;
create index if not exists collections_user_idx on public.collections (user_id, created_at desc);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);
create index if not exists reports_reporter_idx on public.reports (reporter_id, created_at desc);

-- A contributor can edit the report text/photo, but cannot self-approve or change status/counters.
revoke update on public.environment_reports from authenticated;
grant update (description, photo_url) on public.environment_reports to authenticated;

-- Cover every foreign key used by joins, cascades and RLS lookups.
create index if not exists activities_trail_idx on public.activities (trail_id) where trail_id is not null;
create index if not exists activity_photos_activity_idx on public.activity_photos (activity_id);
create index if not exists follows_following_idx on public.follows (following_id, created_at desc);
create index if not exists places_created_by_idx on public.places (created_by) where created_by is not null;
create index if not exists post_photos_post_idx on public.post_photos (post_id, sort_order);
create index if not exists trail_conditions_trail_idx on public.trail_conditions (trail_id, created_at desc);
create index if not exists trail_photos_trail_idx on public.trail_photos (trail_id, created_at desc);
create index if not exists trails_created_by_idx on public.trails (created_by) where created_by is not null;

-- Separate write policies from read policies. This avoids evaluating multiple
-- permissive SELECT policies for the same request while preserving ownership.
drop policy if exists "owners manage activity points" on public.activity_points;
create policy "owners insert activity points" on public.activity_points for insert to authenticated
with check (exists (select 1 from public.activities a where a.id = activity_id and a.user_id = (select auth.uid())));
create policy "owners update activity points" on public.activity_points for update to authenticated
using (exists (select 1 from public.activities a where a.id = activity_id and a.user_id = (select auth.uid())))
with check (exists (select 1 from public.activities a where a.id = activity_id and a.user_id = (select auth.uid())));
create policy "owners delete activity points" on public.activity_points for delete to authenticated
using (exists (select 1 from public.activities a where a.id = activity_id and a.user_id = (select auth.uid())));

drop policy if exists "users manage own activity photos" on public.activity_photos;
create policy "users insert own activity photos" on public.activity_photos for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own activity photos" on public.activity_photos for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own activity photos" on public.activity_photos for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "users manage own trail photos" on public.trail_photos;
create policy "users insert own trail photos" on public.trail_photos for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own trail photos" on public.trail_photos for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own trail photos" on public.trail_photos for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "users manage own reviews" on public.trail_reviews;
create policy "users insert own reviews" on public.trail_reviews for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own reviews" on public.trail_reviews for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own reviews" on public.trail_reviews for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "users manage own conditions" on public.trail_conditions;
create policy "users insert own conditions" on public.trail_conditions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own conditions" on public.trail_conditions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own conditions" on public.trail_conditions for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "users manage own places" on public.places;
create policy "users insert own places" on public.places for insert to authenticated with check (created_by = (select auth.uid()));
create policy "users update own places" on public.places for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy "users delete own places" on public.places for delete to authenticated using (created_by = (select auth.uid()));

drop policy if exists "users manage own follows" on public.follows;
create policy "users insert own follows" on public.follows for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "users delete own follows" on public.follows for delete to authenticated using (follower_id = (select auth.uid()));

drop policy if exists "users manage own posts" on public.posts;
create policy "users insert own posts" on public.posts for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own posts" on public.posts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own posts" on public.posts for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "users manage own post photos" on public.post_photos;
create policy "users insert own post photos" on public.post_photos for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own post photos" on public.post_photos for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own post photos" on public.post_photos for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "users manage own likes" on public.likes;
create policy "users insert own likes" on public.likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users delete own likes" on public.likes for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "users manage own comments" on public.comments;
create policy "users insert own comments" on public.comments for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own comments" on public.comments for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own comments" on public.comments for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "users manage own event response" on public.event_participants;
create policy "users insert own event response" on public.event_participants for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own event response" on public.event_participants for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own event response" on public.event_participants for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "users manage own confirmations" on public.report_confirmations;
create policy "users insert own confirmations" on public.report_confirmations for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users delete own confirmations" on public.report_confirmations for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "users manage own collections" on public.collections;
create policy "users insert own collections" on public.collections for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own collections" on public.collections for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own collections" on public.collections for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "owners manage collection items" on public.collection_items;
create policy "owners insert collection items" on public.collection_items for insert to authenticated
with check (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())));
create policy "owners update collection items" on public.collection_items for update to authenticated
using (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())))
with check (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())));
create policy "owners delete collection items" on public.collection_items for delete to authenticated
using (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())));
