-- Private-by-policy recovery records for the username-only authentication flow.
-- Names, dates of birth and keywords are never stored in plaintext: the Edge
-- Functions persist only keyed HMAC digests produced with the server secret.
create table public.account_recovery_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  identity_digest text not null check (identity_digest ~ '^[a-f0-9]{64}$'),
  keyword_digest text not null check (keyword_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index account_recovery_identity_keyword_idx
  on public.account_recovery_credentials (identity_digest, keyword_digest);

alter table public.account_recovery_credentials enable row level security;
revoke all on table public.account_recovery_credentials from public, anon, authenticated;
grant select, insert, update, delete on table public.account_recovery_credentials to service_role;

create table public.password_recovery_attempts (
  attempt_key text primary key check (char_length(attempt_key) between 67 and 73),
  failures integer not null default 0 check (failures between 0 and 100),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  last_attempt_at timestamptz not null default now()
);

create index password_recovery_blocked_until_idx
  on public.password_recovery_attempts (blocked_until)
  where blocked_until is not null;

alter table public.password_recovery_attempts enable row level security;
revoke all on table public.password_recovery_attempts from public, anon, authenticated;
grant select, insert, update, delete on table public.password_recovery_attempts to service_role;

create or replace function private.touch_account_recovery_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.touch_account_recovery_updated_at() from public, anon, authenticated, service_role;

create trigger touch_account_recovery_updated_at
before update on public.account_recovery_credentials
for each row execute function private.touch_account_recovery_updated_at();
