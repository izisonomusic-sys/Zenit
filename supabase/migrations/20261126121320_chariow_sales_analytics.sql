create table if not exists public.commerce_sales (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  external_sale_id text not null,
  sale_status text not null default 'unknown',
  payment_status text,
  amount numeric,
  original_amount numeric,
  settlement_amount numeric,
  fee_amount numeric,
  currency char(3),
  channel text,
  product_id text,
  product_name text,
  product_type text,
  external_customer_id text,
  external_created_at timestamptz,
  external_completed_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_sales_connection_external_unique unique(connection_id, external_sale_id)
);
create index if not exists commerce_sales_workspace_created_idx
  on public.commerce_sales(workspace_id, external_created_at desc);
create index if not exists commerce_sales_connection_status_idx
  on public.commerce_sales(connection_id, sale_status, payment_status);
alter table public.commerce_sales enable row level security;
create policy commerce_sales_select_member on public.commerce_sales
  for select using (
    exists (select 1 from public.workspace_members wm
      where wm.workspace_id = commerce_sales.workspace_id
        and wm.user_id = (select auth.uid()))
  );
create policy commerce_sales_insert_admin on public.commerce_sales
  for insert with check (
    exists (select 1 from public.workspace_members wm
      where wm.workspace_id = commerce_sales.workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner','admin'))
  );
create policy commerce_sales_update_admin on public.commerce_sales
  for update using (
    exists (select 1 from public.workspace_members wm
      where wm.workspace_id = commerce_sales.workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner','admin'))
  ) with check (
    exists (select 1 from public.workspace_members wm
      where wm.workspace_id = commerce_sales.workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner','admin'))
  );
