-- SESIRA live parity — connect applied C25/C26 domains to the current C19
-- operational-next-step contract and narrow table grants explicitly.

-- Historical projects inherited broad default privileges on these tables.
-- RLS still protected rows, but the capability surface should be explicit.
revoke all on public.interventions from public, anon, authenticated;
grant select, insert, update on public.interventions to authenticated;
grant select, insert, update on public.interventions to service_role;

revoke all on public.field_reports from public, anon, authenticated;
grant select, insert, update on public.field_reports to authenticated;
grant select, insert, update on public.field_reports to service_role;

revoke all on function public.schedule_intervention(uuid, uuid, timestamptz, integer) from public, anon;
grant execute on function public.schedule_intervention(uuid, uuid, timestamptz, integer) to authenticated, service_role;
revoke all on function public.complete_intervention(uuid, uuid, text) from public, anon;
grant execute on function public.complete_intervention(uuid, uuid, text) to authenticated, service_role;
revoke all on function public.transition_field_report_review(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.transition_field_report_review(uuid, uuid, uuid, text) to authenticated;

-- C25 -> current C19 bridge. The intervention itself is authoritative evidence of
-- the operational next step. No heuristic or AI is involved.
create or replace function private.sync_intervention_operational_next_step()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- If an intervention has a scheduled moment and remains operational, mirror it
  -- to a WON opportunity as an INTERVENTION-derived next step.
  if new.opportunity_id is not null
     and new.scheduled_at is not null
     and new.status in ('PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'NEEDS_ATTENTION') then
    update public.opportunities o
      set operational_next_step_at = new.scheduled_at,
          operational_next_step_kind = 'INTERVENTION',
          operational_next_step_source = 'INTERVENTION',
          operational_next_step_updated_at = now(),
          updated_at = now()
    where o.id = new.opportunity_id
      and o.organization_id = new.organization_id
      and o.commercial_state = 'WON'
      and (
        o.operational_next_step_at is null
        or o.operational_next_step_source = 'INTERVENTION'
        or new.scheduled_at < o.operational_next_step_at
      );
  end if;

  -- Clear only the exact intervention-derived timestamp that this row had
  -- supplied. A different manual/system next step is never erased.
  if new.opportunity_id is not null
     and new.status in ('COMPLETED', 'CANCELLED') then
    update public.opportunities o
      set operational_next_step_at = null,
          operational_next_step_kind = null,
          operational_next_step_source = null,
          operational_next_step_updated_at = now(),
          updated_at = now()
    where o.id = new.opportunity_id
      and o.organization_id = new.organization_id
      and o.commercial_state = 'WON'
      and o.operational_next_step_source = 'INTERVENTION'
      and o.operational_next_step_at is not distinct from new.scheduled_at;
  end if;

  return new;
end;
$$;
revoke all on function private.sync_intervention_operational_next_step()
  from public, anon, authenticated, service_role;

drop trigger if exists interventions_sync_operational_next_step on public.interventions;
create trigger interventions_sync_operational_next_step
  after insert or update of opportunity_id, scheduled_at, status on public.interventions
  for each row execute function private.sync_intervention_operational_next_step();

-- Backfill only from currently active scheduled interventions. This is measured
-- data already present in the database, not an inferred date.
with ranked as (
  select
    i.organization_id,
    i.opportunity_id,
    i.scheduled_at,
    row_number() over (
      partition by i.organization_id, i.opportunity_id
      order by i.scheduled_at asc, i.id asc
    ) as rn
  from public.interventions i
  join public.opportunities o
    on o.id = i.opportunity_id and o.organization_id = i.organization_id
  where i.opportunity_id is not null
    and i.scheduled_at is not null
    and i.status in ('PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'NEEDS_ATTENTION')
    and o.commercial_state = 'WON'
)
update public.opportunities o
  set operational_next_step_at = r.scheduled_at,
      operational_next_step_kind = 'INTERVENTION',
      operational_next_step_source = 'INTERVENTION',
      operational_next_step_updated_at = now(),
      updated_at = now()
from ranked r
where r.rn = 1
  and o.id = r.opportunity_id
  and o.organization_id = r.organization_id
  and o.operational_next_step_at is null;

comment on function private.sync_intervention_operational_next_step() is
  'Deterministic C25-to-C19 bridge. A real scheduled intervention becomes an INTERVENTION next step on a WON opportunity. Terminal transition clears only the exact matching intervention-derived timestamp.';
