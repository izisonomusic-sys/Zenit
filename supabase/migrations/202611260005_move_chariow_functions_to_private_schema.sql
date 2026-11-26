create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;
alter function public.zenit_save_chariow_connection(uuid,text,text,text,text) set schema private;
alter function public.zenit_get_chariow_secret(uuid) set schema private;
alter function public.zenit_chariow_sales_summary(uuid) set schema private;
grant execute on function private.zenit_save_chariow_connection(uuid,text,text,text,text) to authenticated;
grant execute on function private.zenit_get_chariow_secret(uuid) to authenticated;
grant execute on function private.zenit_chariow_sales_summary(uuid) to authenticated;
create or replace function public.zenit_save_chariow_connection(p_workspace_id uuid,p_store_id text,p_store_name text,p_store_url text,p_api_key text)
returns uuid language sql security invoker set search_path=public,private,pg_temp as $$
 select private.zenit_save_chariow_connection(p_workspace_id,p_store_id,p_store_name,p_store_url,p_api_key);
$$;
create or replace function public.zenit_get_chariow_secret(p_connection_id uuid)
returns text language sql security invoker set search_path=public,private,pg_temp as $$
 select private.zenit_get_chariow_secret(p_connection_id);
$$;
create or replace function public.zenit_chariow_sales_summary(p_connection_id uuid)
returns table(currency text,total_sales bigint,completed_sales bigint,pending_sales bigint,failed_sales bigint,abandoned_sales bigint,cancelled_payments bigint,gross_revenue numeric,net_settlement numeric,total_fees numeric,unique_customers bigint)
language sql security invoker set search_path=public,private,pg_temp as $$
 select * from private.zenit_chariow_sales_summary(p_connection_id);
$$;
revoke all on function public.zenit_save_chariow_connection(uuid,text,text,text,text) from public,anon;
revoke all on function public.zenit_get_chariow_secret(uuid) from public,anon;
revoke all on function public.zenit_chariow_sales_summary(uuid) from public,anon;
grant execute on function public.zenit_save_chariow_connection(uuid,text,text,text,text) to authenticated;
grant execute on function public.zenit_get_chariow_secret(uuid) to authenticated;
grant execute on function public.zenit_chariow_sales_summary(uuid) to authenticated;