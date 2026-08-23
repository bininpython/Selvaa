-- Keep recovery internals completely inaccessible through browser clients.
-- Explicit deny policies document that this is intentional and complement
-- the revoked table privileges; only service_role is granted table access.
create policy "clients cannot read or change recovery credentials"
on public.account_recovery_credentials
for all
to anon, authenticated
using (false)
with check (false);

create policy "clients cannot read or change recovery attempts"
on public.password_recovery_attempts
for all
to anon, authenticated
using (false)
with check (false);
