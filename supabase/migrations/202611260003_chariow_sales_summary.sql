drop function if exists public.zenit_chariow_sales_summary(uuid);
create function public.zenit_chariow_sales_summary(p_connection_id uuid)
returns table(currency text,total_sales bigint,completed_sales bigint,pending_sales bigint,failed_sales bigint,abandoned_sales bigint,gross_revenue numeric,net_settlement numeric,total_fees numeric,unique_customers bigint)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from public.integration_connections c join public.workspace_members m on m.workspace_id=c.workspace_id where c.id=p_connection_id and c.provider='chariow'::public.source_type and m.user_id=auth.uid()) then raise exception 'Not authorized to view this integration'; end if;
 return query
 select coalesce(s.currency,'N/A'),count(*)::bigint,
 count(*) filter(where s.sale_status in ('completed','settled'))::bigint,
 count(*) filter(where s.sale_status='awaiting_payment')::bigint,
 count(*) filter(where s.sale_status='failed')::bigint,
 count(*) filter(where s.sale_status='abandoned')::bigint,
 coalesce(sum(s.amount) filter(where s.sale_status in ('completed','settled')),0)::numeric,
 coalesce(sum(s.settlement_amount) filter(where s.sale_status in ('completed','settled')),0)::numeric,
 coalesce(sum(s.fee_amount) filter(where s.sale_status in ('completed','settled')),0)::numeric,
 count(distinct s.external_customer_id) filter(where s.external_customer_id is not null)::bigint
 from public.commerce_sales s where s.connection_id=p_connection_id group by coalesce(s.currency,'N/A') order by coalesce(s.currency,'N/A');
end; $$;
revoke all on function public.zenit_chariow_sales_summary(uuid) from public,anon;
grant execute on function public.zenit_chariow_sales_summary(uuid) to authenticated;