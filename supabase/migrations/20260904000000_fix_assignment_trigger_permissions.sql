-- SESIRA Core Workflow — P0 gate fixes.
--
-- Two independent gaps closed in one commit because both block the
-- offensive SQL suite:
--
--   (a) The three assignment triggers cannot invoke their guard
--       helper — every authenticated UPDATE that sets an assignee
--       fails 42501 "permission denied" instead of the intended
--       23514 check_violation. Detail below.
--
--   (b) `automation_configs_organization_id_template_key_key` is
--       a full unique index. That means an org cannot keep an
--       audit trail of previously-enabled configs (they'd have to
--       be deleted, losing the history), and the offensive test
--       cannot exercise the "config disabled -> quote not due"
--       stop guard side-by-side with an enabled config. Convert to
--       a partial unique on `enabled = true`: at most one *active*
--       config per (org, template_key), unlimited disabled variants.

-- =========================================================================
-- (a) Assignment trigger permission fix
-- =========================================================================
--
-- The assignment triggers introduced in 20260826130000
-- (enforce_requests_assignment, enforce_quotes_assignment,
-- enforce_attention_items_assignment) are declared SECURITY INVOKER
-- and call `private.assert_tenant_active_assignment(...)`, whose
-- EXECUTE grant is REVOKED from all roles (including authenticated).
--
-- Consequence: every authenticated UPDATE that sets an assigned_user_id
-- (or owner_user_id on quotes) — legitimate or not — raises 42501
-- "permission denied for function assert_tenant_active_assignment"
-- BEFORE the guard has a chance to check the membership. The behavior
-- is technically "reject", but for the wrong reason:
--
--   * an operator debugging "why can't I assign a legitimate teammate?"
--     sees 42501 and cannot distinguish it from an RLS denial;
--   * the offensive suite's expected 23514 (check_violation) never
--     fires;
--   * cross-tenant assignments happen to be rejected too, but only
--     as an accidental side-effect of the permission bug — the actual
--     tenant-safety guard has never run in production.
--
-- Fix: switch the three trigger functions to SECURITY DEFINER so they
-- inherit the definer's EXECUTE grant on the private guard. The
-- trigger bodies are unchanged; the guard function itself is already
-- SECURITY DEFINER and hardened with `set search_path = ''`.
--
-- SECURITY IMPACT: none new. Making a trigger function DEFINER does
-- not widen the caller's UPDATE authority — the RLS UPDATE policy
-- (`is_organization_member(organization_id)` USING + WITH CHECK) has
-- already vetted the caller by the time the BEFORE UPDATE trigger
-- fires. The DEFINER context only lifts the accidental EXECUTE denial
-- on the internal helper.

create or replace function private.enforce_requests_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_tenant_active_assignment(new.organization_id, new.assigned_user_id);
  return new;
end;
$$;

create or replace function private.enforce_quotes_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_tenant_active_assignment(new.organization_id, new.owner_user_id);
  return new;
end;
$$;

create or replace function private.enforce_attention_items_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_tenant_active_assignment(new.organization_id, new.assigned_user_id);
  return new;
end;
$$;

comment on function private.enforce_requests_assignment() is
  'BEFORE INSERT/UPDATE trigger on requests.assigned_user_id. SECURITY DEFINER so it can invoke the (revoked-from-all) private.assert_tenant_active_assignment helper. Guarded by RLS + assignment guard (23514) — no widening of caller authority.';
comment on function private.enforce_quotes_assignment() is
  'BEFORE INSERT/UPDATE trigger on quotes.owner_user_id. Same DEFINER pattern as enforce_requests_assignment. See 20260904 header.';
comment on function private.enforce_attention_items_assignment() is
  'BEFORE INSERT/UPDATE trigger on attention_items.assigned_user_id. Same DEFINER pattern as enforce_requests_assignment. See 20260904 header.';

-- =========================================================================
-- (b) automation_configs unique — partial on enabled = true
-- =========================================================================
-- The original constraint (from 20260823115600) is a hard unique on
-- (organization_id, template_key). Drop it and replace with a partial
-- unique indexed on enabled = true. Disabled variants are unlimited
-- (audit trail); at most one active config per (org, template) survives.

alter table public.automation_configs
  drop constraint if exists automation_configs_organization_id_template_key_key;

drop index if exists public.automation_configs_org_template_active_idx;

create unique index automation_configs_org_template_active_idx
  on public.automation_configs (organization_id, template_key)
  where enabled = true;

comment on index public.automation_configs_org_template_active_idx is
  'At most one enabled config per (organization, template_key). Disabled variants are unlimited so an org can keep an audit trail of prior configs without breaking uniqueness. Enforced identity for the runtime lookup by list_due_quote_followup_runs (which already filters enabled = true).';
