-- Preserve the complete 30-character login username in the public profile.
-- The UUID suffix remains available only as a defensive fallback for legacy
-- duplicate metadata created outside the controlled signup function.
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
  base_username := left(base_username, 30);
  safe_username := base_username;
  if exists (select 1 from public.profiles where username = safe_username) then
    safe_username := left(base_username, 21) || '_' || substr(new.id::text, 1, 8);
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
