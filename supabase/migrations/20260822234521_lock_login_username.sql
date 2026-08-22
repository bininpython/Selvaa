-- Keep the public username stable because it is also the account login identifier.
create or replace function private.prevent_profile_username_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.username is distinct from old.username then
    raise exception using
      errcode = '22023',
      message = 'username is immutable';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_profile_username_change() from public, anon, authenticated, service_role;

drop trigger if exists prevent_profile_username_change on public.profiles;
create trigger prevent_profile_username_change
before update of username on public.profiles
for each row execute function private.prevent_profile_username_change();
