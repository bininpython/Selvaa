-- SELVA+ social notifications, automatic achievements and private-group integrity.

drop policy if exists "users join groups" on public.group_members;
create policy "users join public groups" on public.group_members for insert to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'member'
  and exists (select 1 from public.groups g where g.id = group_id and g.privacy = 'public')
);

create or replace function private.notify_like()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  select p.user_id into recipient from public.posts p where p.id = new.post_id;
  if recipient is not null and recipient <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, title, body, data)
    values (recipient, new.user_id, 'like', 'Sua aventura recebeu uma curtida', null, jsonb_build_object('post_id', new.post_id));
  end if;
  return new;
end;
$$;
revoke all on function private.notify_like() from public, anon, authenticated, service_role;
drop trigger if exists notify_post_like on public.likes;
create trigger notify_post_like after insert on public.likes for each row execute function private.notify_like();

create or replace function private.notify_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  select p.user_id into recipient from public.posts p where p.id = new.post_id;
  if recipient is not null and recipient <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, title, body, data)
    values (recipient, new.user_id, 'comment', 'Novo comentário na sua aventura', left(new.body, 160), jsonb_build_object('post_id', new.post_id, 'comment_id', new.id));
  end if;
  return new;
end;
$$;
revoke all on function private.notify_comment() from public, anon, authenticated, service_role;
drop trigger if exists notify_post_comment on public.comments;
create trigger notify_post_comment after insert on public.comments for each row execute function private.notify_comment();

create or replace function private.notify_follow()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, actor_id, type, title, body, data)
  values (new.following_id, new.follower_id, 'follow', 'Um aventureiro começou a seguir você', null, jsonb_build_object('profile_id', new.follower_id));
  return new;
end;
$$;
revoke all on function private.notify_follow() from public, anon, authenticated, service_role;
drop trigger if exists notify_new_follow on public.follows;
create trigger notify_new_follow after insert on public.follows for each row execute function private.notify_follow();

create or replace function private.notify_achievement()
returns trigger language plpgsql security definer set search_path = '' as $$
declare achievement_name text; achievement_description text;
begin
  select a.name, a.description into achievement_name, achievement_description
  from public.achievements a where a.id = new.achievement_id;
  insert into public.notifications (user_id, type, title, body, data)
  values (new.user_id, 'achievement', 'Conquista desbloqueada: ' || achievement_name, achievement_description, jsonb_build_object('achievement_id', new.achievement_id));
  return new;
end;
$$;
revoke all on function private.notify_achievement() from public, anon, authenticated, service_role;
drop trigger if exists notify_new_achievement on public.user_achievements;
create trigger notify_new_achievement after insert on public.user_achievements for each row execute function private.notify_achievement();

create or replace function private.evaluate_activity_achievements()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_user uuid; activity_total integer; long_activity_total integer; distance_total numeric; elevation_total numeric;
begin
  target_user := coalesce(new.user_id, old.user_id);
  select count(*)::integer,
         count(*) filter (where distance_m >= 15000)::integer,
         coalesce(sum(distance_m), 0),
         coalesce(sum(elevation_gain_m), 0)
    into activity_total, long_activity_total, distance_total, elevation_total
  from public.activities where user_id = target_user;

  insert into public.user_achievements (user_id, achievement_id)
  select target_user, a.id from public.achievements a
  where (a.code = 'first_steps' and activity_total >= 1)
     or (a.code = 'explorer' and activity_total >= coalesce(a.threshold, 10))
     or (a.code = 'mateiro' and distance_total >= coalesce(a.threshold, 50000))
     or (a.code = 'trailblazer' and distance_total >= coalesce(a.threshold, 250000))
     or (a.code = 'mountaineer' and elevation_total >= coalesce(a.threshold, 5000))
     or (a.code = 'expeditioner' and long_activity_total >= coalesce(a.threshold, 10))
  on conflict do nothing;
  return coalesce(new, old);
end;
$$;
revoke all on function private.evaluate_activity_achievements() from public, anon, authenticated, service_role;
drop trigger if exists evaluate_activity_achievements on public.activities;
create trigger evaluate_activity_achievements after insert or update or delete on public.activities
for each row execute function private.evaluate_activity_achievements();

create or replace function private.evaluate_environment_achievements()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_user uuid; contribution_total integer;
begin
  target_user := coalesce(new.user_id, old.user_id);
  select
    (select count(*) from public.environment_reports where user_id = target_user)
    + (select count(*) from public.report_confirmations where user_id = target_user)
    into contribution_total;
  insert into public.user_achievements (user_id, achievement_id)
  select target_user, a.id from public.achievements a
  where a.code = 'nature_guardian' and contribution_total >= coalesce(a.threshold, 5)
  on conflict do nothing;
  return coalesce(new, old);
end;
$$;
revoke all on function private.evaluate_environment_achievements() from public, anon, authenticated, service_role;
drop trigger if exists evaluate_report_achievements on public.environment_reports;
create trigger evaluate_report_achievements after insert or delete on public.environment_reports
for each row execute function private.evaluate_environment_achievements();
drop trigger if exists evaluate_confirmation_achievements on public.report_confirmations;
create trigger evaluate_confirmation_achievements after insert or delete on public.report_confirmations
for each row execute function private.evaluate_environment_achievements();

create index if not exists notifications_unread_user_idx on public.notifications (user_id, created_at desc) where read_at is null;
create index if not exists event_participants_event_response_idx on public.event_participants (event_id, response);
