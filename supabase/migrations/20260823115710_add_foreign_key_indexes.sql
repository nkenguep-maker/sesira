create index attention_items_assigned_user_idx
  on public.attention_items (assigned_user_id)
  where assigned_user_id is not null;

create index automation_runs_config_org_idx
  on public.automation_runs (automation_config_id, organization_id)
  where automation_config_id is not null;

create index automation_runs_event_org_idx
  on public.automation_runs (trigger_event_id, organization_id)
  where trigger_event_id is not null;

create index messages_customer_org_idx
  on public.messages (customer_id, organization_id)
  where customer_id is not null;

create index messages_request_org_idx
  on public.messages (request_id, organization_id)
  where request_id is not null;

create index messages_quote_org_idx
  on public.messages (quote_id, organization_id)
  where quote_id is not null;

create index quotes_customer_org_idx
  on public.quotes (customer_id, organization_id);

create index quotes_request_org_idx
  on public.quotes (request_id, organization_id)
  where request_id is not null;

create index quotes_owner_user_idx
  on public.quotes (owner_user_id)
  where owner_user_id is not null;

create index requests_customer_org_idx
  on public.requests (customer_id, organization_id)
  where customer_id is not null;

create index requests_service_org_idx
  on public.requests (service_catalog_item_id, organization_id)
  where service_catalog_item_id is not null;

create index requests_assigned_user_idx
  on public.requests (assigned_user_id)
  where assigned_user_id is not null;
