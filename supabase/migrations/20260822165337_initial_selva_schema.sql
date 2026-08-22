-- SELVA+ initial schema — PostgreSQL 17 / Supabase
create extension if not exists pgcrypto;
create extension if not exists postgis with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  full_name text not null,
  avatar_url text,
  cover_url text,
  bio text check (char_length(bio) <= 280),
  city text,
  state text,
  country text not null default 'BR',
  experience_level text not null default 'novato',
  interests text[] not null default '{}',
  profile_visibility text not null default 'public' check (profile_visibility in ('public','private')),
  hide_route_endpoints boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trails (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  location text,
  distance_m integer not null default 0 check (distance_m >= 0),
  elevation_gain integer not null default 0 check (elevation_gain >= 0),
  difficulty text not null default 'moderate' check (difficulty in ('easy','moderate','hard','expert')),
  estimated_duration integer,
  route_geojson jsonb,
  latitude double precision,
  longitude double precision,
  geography extensions.geography(point, 4326) generated always as (
    case when latitude is null or longitude is null then null
      else extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography end
  ) stored,
  region text,
  city text,
  state text,
  terrain_type text,
  max_altitude_m numeric,
  best_season text,
  water_source boolean,
  cell_signal text,
  camping_area boolean,
  entrance_fee numeric(10,2),
  parking boolean,
  pets_allowed boolean,
  guide_required boolean,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trail_id uuid references public.trails(id) on delete set null,
  title text not null,
  description text,
  activity_type text not null,
  distance_m numeric not null default 0 check (distance_m >= 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  moving_time_seconds integer not null default 0 check (moving_time_seconds >= 0),
  elevation_gain_m numeric not null default 0,
  elevation_loss_m numeric not null default 0,
  max_altitude_m numeric,
  min_altitude_m numeric,
  avg_speed numeric,
  max_speed numeric,
  avg_pace numeric,
  started_at timestamptz not null,
  finished_at timestamptz,
  difficulty text,
  trail_conditions text,
  visibility text not null default 'public' check (visibility in ('public','followers','private')),
  route_geojson jsonb,
  sync_status text not null default 'synced' check (sync_status in ('pending','syncing','synced','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_points (
  id bigint generated always as identity primary key,
  activity_id uuid not null references public.activities(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  altitude numeric,
  accuracy numeric,
  speed numeric,
  recorded_at timestamptz not null,
  geography extensions.geography(point, 4326) generated always as (
    extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
  ) stored
);

create table public.activity_photos (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.trail_photos (
  id uuid primary key default gen_random_uuid(), trail_id uuid not null references public.trails(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, storage_path text not null,
  caption text, created_at timestamptz not null default now()
);

create table public.trail_reviews (
  id uuid primary key default gen_random_uuid(), trail_id uuid not null references public.trails(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, rating smallint not null check (rating between 1 and 5),
  review text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (trail_id, user_id)
);

create table public.trail_conditions (
  id uuid primary key default gen_random_uuid(), trail_id uuid not null references public.trails(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, condition text not null,
  notes text, valid_until timestamptz, created_at timestamptz not null default now()
);

create table public.places (
  id uuid primary key default gen_random_uuid(), created_by uuid references public.profiles(id) on delete set null,
  name text not null, category text not null, description text, latitude double precision not null,
  longitude double precision not null, geography extensions.geography(point, 4326) generated always as (
    extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
  ) stored, city text, state text, verified boolean not null default false, created_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (follower_id, following_id), check (follower_id <> following_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null, title text, body text,
  location text, visibility text not null default 'public' check (visibility in ('public','followers','private')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.post_photos (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, storage_path text not null,
  sort_order integer not null default 0, created_at timestamptz not null default now()
);

create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, post_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade, body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, slug text not null unique, description text, avatar_url text, cover_url text, city text, state text,
  privacy text not null default 'public' check (privacy in ('public','private')), member_count integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','moderator','member')),
  joined_at timestamptz not null default now(), primary key (group_id, user_id)
);

create table public.group_posts (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, activity_id uuid references public.activities(id) on delete set null,
  body text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null, name text not null, description text, start_at timestamptz not null,
  meeting_point text, latitude double precision, longitude double precision,
  geography extensions.geography(point, 4326) generated always as (
    case when latitude is null or longitude is null then null else extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography end
  ) stored, difficulty text, distance numeric, max_participants integer, recommended_equipment text[],
  visibility text not null default 'public' check (visibility in ('public','group','private')), created_at timestamptz not null default now()
);

create table public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response text not null default 'going' check (response in ('going','maybe','not_going')),
  joined_at timestamptz not null default now(), primary key (event_id, user_id)
);

create table public.environment_reports (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  trail_id uuid references public.trails(id) on delete set null, category text not null, description text not null,
  latitude double precision not null, longitude double precision not null, photo_url text,
  geography extensions.geography(point, 4326) generated always as (
    extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
  ) stored, status text not null default 'reported' check (status in ('reported','confirmed','in_review','resolved')),
  confirmation_count integer not null default 0, created_at timestamptz not null default now(), resolved_at timestamptz
);

create table public.report_confirmations (
  report_id uuid not null references public.environment_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (report_id, user_id)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, description text not null,
  icon text, points integer not null default 0, threshold numeric, category text, created_at timestamptz not null default now()
);

create table public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(), primary key (user_id, achievement_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null, type text not null, title text not null, body text,
  data jsonb not null default '{}', read_at timestamptz, created_at timestamptz not null default now()
);

create table public.user_statistics (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  activity_count integer not null default 0, total_distance_m numeric not null default 0,
  total_duration_seconds bigint not null default 0, total_elevation_gain_m numeric not null default 0,
  trails_completed integer not null default 0, states_explored integer not null default 0,
  places_discovered integer not null default 0, reputation_points integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, description text, is_public boolean not null default false, created_at timestamptz not null default now()
);

create table public.collection_items (
  id uuid primary key default gen_random_uuid(), collection_id uuid not null references public.collections(id) on delete cascade,
  item_type text not null check (item_type in ('trail','post','place','event')),
  item_id uuid not null, created_at timestamptz not null default now(), unique (collection_id, item_type, item_id)
);

create table public.saved_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('trail','post','place','event')),
  item_id uuid not null, created_at timestamptz not null default now(), primary key (user_id, item_type, item_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (blocker_id, blocked_id), check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('user','post','comment','group','trail')),
  target_id uuid not null, reason text not null, details text, status text not null default 'open', created_at timestamptz not null default now()
);

create index trails_geography_gix on public.trails using gist (geography);
create index places_geography_gix on public.places using gist (geography);
create index reports_geography_gix on public.environment_reports using gist (geography);
create index activities_user_created_idx on public.activities (user_id, created_at desc);
create index activity_points_activity_recorded_idx on public.activity_points (activity_id, recorded_at);
create index posts_user_created_idx on public.posts (user_id, created_at desc);
create index posts_created_idx on public.posts (created_at desc);
create index comments_post_created_idx on public.comments (post_id, created_at);
create index group_members_user_idx on public.group_members (user_id);
create index group_posts_group_created_idx on public.group_posts (group_id, created_at desc);
create index events_group_start_idx on public.events (group_id, start_at);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index environment_reports_trail_idx on public.environment_reports (trail_id, created_at desc);

create or replace function public.nearby_trails(lat double precision, lng double precision, radius_m integer default 50000)
returns setof public.trails language sql stable security invoker set search_path = '' as $$
  select t.* from public.trails t
  where t.geography is not null and extensions.st_dwithin(
    t.geography,
    extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography,
    radius_m
  ) order by extensions.st_distance(
    t.geography,
    extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'aventureiro_' || substr(new.id::text, 1, 8)), coalesce(new.raw_user_meta_data->>'full_name', 'Novo aventureiro'));
  insert into public.user_statistics (user_id) values (new.id);
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.trails enable row level security;
alter table public.activities enable row level security;
alter table public.activity_points enable row level security;
alter table public.activity_photos enable row level security;
alter table public.trail_photos enable row level security;
alter table public.trail_reviews enable row level security;
alter table public.trail_conditions enable row level security;
alter table public.places enable row level security;
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.post_photos enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_posts enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.environment_reports enable row level security;
alter table public.report_confirmations enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.notifications enable row level security;
alter table public.user_statistics enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.saved_items enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

create policy "public profiles are readable" on public.profiles for select using (profile_visibility = 'public' or id = (select auth.uid()));
create policy "users update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "trails are public" on public.trails for select using (true);
create policy "authenticated create trails" on public.trails for insert to authenticated with check (created_by = (select auth.uid()));
create policy "owners update trails" on public.trails for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy "owners delete trails" on public.trails for delete to authenticated using (created_by = (select auth.uid()));

create policy "visible activities are readable" on public.activities for select using (
  user_id = (select auth.uid()) or visibility = 'public' or
  (visibility = 'followers' and exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = user_id))
);
create policy "users create own activities" on public.activities for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own activities" on public.activities for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own activities" on public.activities for delete to authenticated using (user_id = (select auth.uid()));
-- Raw GPS samples are precise and stay private. Public routes use the sanitized
-- GeoJSON stored on activities instead of exposing the underlying samples.
create policy "owners read precise activity points" on public.activity_points for select to authenticated
using (exists (select 1 from public.activities a where a.id = activity_id and a.user_id = (select auth.uid())));
create policy "owners manage activity points" on public.activity_points for all to authenticated using (exists (select 1 from public.activities a where a.id = activity_id and a.user_id = (select auth.uid()))) with check (exists (select 1 from public.activities a where a.id = activity_id and a.user_id = (select auth.uid())));

create policy "public content photos readable" on public.activity_photos for select using (exists (select 1 from public.activities a where a.id = activity_id and (a.user_id = (select auth.uid()) or a.visibility = 'public')));
create policy "users manage own activity photos" on public.activity_photos for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "trail photos public" on public.trail_photos for select using (true);
create policy "users manage own trail photos" on public.trail_photos for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "trail reviews public" on public.trail_reviews for select using (true);
create policy "users manage own reviews" on public.trail_reviews for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "trail conditions public" on public.trail_conditions for select using (true);
create policy "users manage own conditions" on public.trail_conditions for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "places public" on public.places for select using (true);
create policy "users manage own places" on public.places for all to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

create policy "follows readable" on public.follows for select using (true);
create policy "users manage own follows" on public.follows for all to authenticated using (follower_id = (select auth.uid())) with check (follower_id = (select auth.uid()));
create policy "visible posts readable" on public.posts for select using (user_id = (select auth.uid()) or visibility = 'public' or (visibility = 'followers' and exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = user_id)));
create policy "users manage own posts" on public.posts for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "post photos follow post" on public.post_photos for select using (exists (select 1 from public.posts p where p.id = post_id and (p.user_id = (select auth.uid()) or p.visibility = 'public')));
create policy "users manage own post photos" on public.post_photos for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "likes readable" on public.likes for select using (true);
create policy "users manage own likes" on public.likes for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "comments on visible posts readable" on public.comments for select using (exists (select 1 from public.posts p where p.id = post_id and (p.user_id = (select auth.uid()) or p.visibility = 'public')));
create policy "users manage own comments" on public.comments for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "public groups or members readable" on public.groups for select using (privacy = 'public' or owner_id = (select auth.uid()) or exists (select 1 from public.group_members gm where gm.group_id = id and gm.user_id = (select auth.uid())));
create policy "users create groups" on public.groups for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "group staff update groups" on public.groups for update to authenticated using (exists (select 1 from public.group_members gm where gm.group_id = id and gm.user_id = (select auth.uid()) and gm.role in ('owner','admin'))) with check (exists (select 1 from public.group_members gm where gm.group_id = id and gm.user_id = (select auth.uid()) and gm.role in ('owner','admin')));
create policy "owners delete groups" on public.groups for delete to authenticated using (owner_id = (select auth.uid()));
create policy "group memberships readable" on public.group_members for select using (true);
create policy "users join groups" on public.group_members for insert to authenticated with check (user_id = (select auth.uid()));
create policy "members leave groups" on public.group_members for delete to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.group_members staff where staff.group_id = group_id and staff.user_id = (select auth.uid()) and staff.role in ('owner','admin','moderator')));
create policy "group posts readable by members or public groups" on public.group_posts for select using (exists (select 1 from public.groups g where g.id = group_id and (g.privacy = 'public' or exists (select 1 from public.group_members gm where gm.group_id = g.id and gm.user_id = (select auth.uid())))));
create policy "members create group posts" on public.group_posts for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = (select auth.uid())));
create policy "users manage own group posts" on public.group_posts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own group posts" on public.group_posts for delete to authenticated using (user_id = (select auth.uid()));

create policy "visible events readable" on public.events for select using (visibility = 'public' or creator_id = (select auth.uid()) or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = (select auth.uid()))));
create policy "users create events" on public.events for insert to authenticated with check (creator_id = (select auth.uid()));
create policy "creators manage events" on public.events for update to authenticated using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));
create policy "creators delete events" on public.events for delete to authenticated using (creator_id = (select auth.uid()));
create policy "participants readable" on public.event_participants for select using (true);
create policy "users manage own event response" on public.event_participants for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "environment reports public" on public.environment_reports for select using (true);
create policy "users create environmental reports" on public.environment_reports for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own environmental reports" on public.environment_reports for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own environmental reports" on public.environment_reports for delete to authenticated using (user_id = (select auth.uid()));
create policy "confirmations readable" on public.report_confirmations for select using (true);
create policy "users manage own confirmations" on public.report_confirmations for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "achievements public" on public.achievements for select using (true);
create policy "unlocked achievements public" on public.user_achievements for select using (true);
create policy "users read own notifications" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "users update own notifications" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "statistics public" on public.user_statistics for select using (true);
create policy "collections visible to owner or public" on public.collections for select using (is_public or user_id = (select auth.uid()));
create policy "users manage own collections" on public.collections for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "collection items follow collection" on public.collection_items for select using (exists (select 1 from public.collections c where c.id = collection_id and (c.is_public or c.user_id = (select auth.uid()))));
create policy "owners manage collection items" on public.collection_items for all to authenticated using (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid()))) with check (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())));
create policy "users manage own saved items" on public.saved_items for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users manage own blocks" on public.blocks for all to authenticated using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));
create policy "users create reports" on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "users read own reports" on public.reports for select to authenticated using (reporter_id = (select auth.uid()));

insert into storage.buckets (id, name, public) values
  ('avatars','avatars',false), ('covers','covers',false), ('activity-photos','activity-photos',false),
  ('trail-photos','trail-photos',false), ('group-images','group-images',false), ('environment-reports','environment-reports',false)
on conflict (id) do nothing;

-- Buckets remain private. Object reads are mediated by RLS and temporary signed
-- URLs, so changing a database row's visibility also revokes future access.
create policy "community media readable" on storage.objects for select to anon, authenticated
using (bucket_id in ('avatars','covers','trail-photos','group-images','environment-reports'));
create policy "users upload own media" on storage.objects for insert to authenticated with check (bucket_id in ('avatars','covers','activity-photos','trail-photos','group-images','environment-reports') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users update own media" on storage.objects for update to authenticated
using (bucket_id in ('avatars','covers','activity-photos','trail-photos','group-images','environment-reports') and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id in ('avatars','covers','activity-photos','trail-photos','group-images','environment-reports') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users delete own media" on storage.objects for delete to authenticated
using (bucket_id in ('avatars','covers','activity-photos','trail-photos','group-images','environment-reports') and (storage.foldername(name))[1] = (select auth.uid())::text);

-- New Supabase projects may still inherit broad default grants. Reset them
-- before opting each client role into the minimum API surface below.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete, truncate, references, trigger on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select, update on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on
  public.profiles, public.trails, public.activities, public.activity_photos,
  public.trail_photos, public.trail_reviews, public.trail_conditions, public.places,
  public.follows, public.posts, public.post_photos, public.likes, public.comments,
  public.groups, public.group_members, public.group_posts, public.events,
  public.event_participants, public.environment_reports, public.report_confirmations,
  public.achievements, public.user_achievements, public.user_statistics,
  public.collections, public.collection_items
to anon;
grant select on all tables in schema public to authenticated;
grant update on public.profiles to authenticated;
grant insert, update, delete on public.trails, public.activities, public.activity_points,
  public.activity_photos, public.trail_photos, public.trail_reviews, public.trail_conditions,
  public.places, public.follows, public.posts, public.post_photos, public.likes,
  public.comments, public.groups, public.group_members, public.group_posts, public.events,
  public.event_participants, public.environment_reports, public.report_confirmations,
  public.collections, public.collection_items, public.saved_items, public.blocks
to authenticated;
grant insert on public.reports to authenticated;
grant update on public.notifications to authenticated;
grant usage, select on sequence public.activity_points_id_seq to authenticated;
grant execute on function public.nearby_trails(double precision, double precision, integer) to anon, authenticated;
