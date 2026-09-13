-- SESIRA — canonical technician organization role
--
-- The field application uses TECHNICIAN as the canonical role for users
-- who should land on the technician experience. Keep the role constraint
-- aligned with the application before provisioning technician accounts.

alter table public.organization_members
  drop constraint if exists organization_members_role_check;

alter table public.organization_members
  add constraint organization_members_role_check
  check (role in ('OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'TECHNICIAN'));

comment on column public.organization_members.role is
  'Organization access role. TECHNICIAN is the canonical field-worker role used by SESIRA Terrain.';
