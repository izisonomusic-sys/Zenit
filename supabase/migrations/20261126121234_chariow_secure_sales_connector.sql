create table if not exists public.commerce_sales (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 connection_id uuid not null references public.integration_connections(id) on delete cascade,
 external_sale_id text not null,
 sale_status text not null,
 payment_status text,
 amount numeric(14,2),
 original_amount numeric(14,2),
 settlement_amount numeric(14,2),
 fee_amount numeric(14,2),
 currency text,
 channel text,
 product_id text,
 product_name text,
 product_type text,
 external_customer_id text,
 external_created_at timestamptz,
 external_completed_at timestamptz,
 payload jsonb not null default '{}'::jsonb,
 synced_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 unique(connection_id, external_sale_id)
);
create index if not exists commerce_sales_workspace_created_idx on public.commerce_sales(workspace_id, external_created_at desc);
create index if not exists commerce_sales_connection_status_idx on public.commerce_sales(connection_id, sale_status, payment_status);
alter table public.commerce_sales enable row level security;
drop policy if exists commerce_sales_member_all on public.commerce_sales;
create policy commerce_sales_member_all on public.commerce_sales
 for all to authenticated
 using (exists (select 1 from public.workspace_members m where m.workspace_id = commerce_sales.workspace_id and m.user_id = (select auth.uid())))
 with check (exists (select 1 from public.workspace_members m where m.workspace_id = commerce_sales.workspace_id and m.user_id = (select auth.uid())));
create or replace function public.zenit_save_chariow_connection(
 p_workspace_id uuid,p_store_id text,p_store_name text,p_store_url text,p_api_key text
) returns uuid language plpgsql security definer set search_path=public,vault,pg_temp as $$
declare v_user_id uuid:=auth.uid();v_secret_id uuid;v_connection_id uuid;
begin
 if v_user_id is null then raise exception 'Authentication required'; end if;
 if length(coalesce(p_api_key,''))<16 then raise exception 'Invalid API key'; end if;
 if not exists(select 1 from public.workspace_members m where m.workspace_id=p_workspace_id and m.user_id=v_user_id and m.role in ('owner','admin')) then raise exception 'Workspace administrator permission required'; end if;
 v_secret_id:=vault.create_secret(p_api_key,'zenit_chariow_'||p_workspace_id::text||'_'||gen_random_uuid()::text,'Read-only Chariow API credential stored by ZENIT');
 select id into v_connection_id from public.integration_connections where workspace_id=p_workspace_id and provider='chariow'::public.source_type and external_account_id=p_store_id limit 1;
 if v_connection_id is null then
  insert into public.integration_connections(workspace_id,provider,display_name,external_account_id,status,secret_reference,scopes,created_by)
  values(p_workspace_id,'chariow'::public.source_type,coalesce(nullif(p_store_name,''),'Chariow'),p_store_id,'connected',v_secret_id::text,array['store:read','sales:read'],v_user_id) returning id into v_connection_id;
 else
  update public.integration_connections set display_name=coalesce(nullif(p_store_name,''),'Chariow'),status='connected',secret_reference=v_secret_id::text,scopes=array['store:read','sales:read'],updated_at=now() where id=v_connection_id;
 end if;
 update public.data_sources set name=coalesce(nullif(p_store_name,''),'Chariow'),status='connected',config=jsonb_build_object('provider','chariow','store_id',p_store_id,'store_url',p_store_url,'connection_id',v_connection_id,'connection_method','api_key'),updated_at=now()
 where workspace_id=p_workspace_id and source='chariow'::public.source_type and config->>'store_id'=p_store_id;
 if not found then
  insert into public.data_sources(workspace_id,name,source,status,config,created_by)
  values(p_workspace_id,coalesce(nullif(p_store_name,''),'Chariow'),'chariow'::public.source_type,'connected',jsonb_build_object('provider','chariow','store_id',p_store_id,'store_url',p_store_url,'connection_id',v_connection_id,'connection_method','api_key'),v_user_id);
 end if;
 return v_connection_id;
end; $$;
revoke all on function public.zenit_save_chariow_connection(uuid,text,text,text,text) from public,anon;
grant execute on function public.zenit_save_chariow_connection(uuid,text,text,text,text) to authenticated;
create or replace function public.zenit_get_chariow_secret(p_connection_id uuid) returns text
language plpgsql security definer set search_path=public,vault,pg_temp as $$
declare v_secret text;
begin
 if not exists(select 1 from public.integration_connections c join public.workspace_members m on m.workspace_id=c.workspace_id where c.id=p_connection_id and c.provider='chariow'::public.source_type and c.status='connected' and m.user_id=auth.uid() and m.role in ('owner','admin')) then raise exception 'Not authorized to access this integration'; end if;
 select d.decrypted_secret into v_secret from public.integration_connections c join vault.decrypted_secrets d on d.id::text=c.secret_reference where c.id=p_connection_id;
 if v_secret is null then raise exception 'Integration credential unavailable'; end if;
 return v_secret;
end; $$;
revoke all on function public.zenit_get_chariow_secret(uuid) from public,anon;
grant execute on function public.zenit_get_chariow_secret(uuid) to authenticated;