-- Create the workspace creator's owner membership atomically.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create or replace function private.add_workspace_owner() returns trigger
language plpgsql security definer set search_path=''
as $$ begin
 insert into public.workspace_members(workspace_id,user_id,role)
 values(new.id,new.created_by,'owner') on conflict(workspace_id,user_id) do nothing;
 return new;
end $$;
revoke all on function private.add_workspace_owner() from public,anon,authenticated;
drop trigger if exists on_workspace_created_add_owner on public.workspaces;
create trigger on_workspace_created_add_owner after insert on public.workspaces
for each row execute procedure private.add_workspace_owner();
drop policy if exists membership_insert_workspace_creator on public.workspace_members;

create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);
create index if not exists workspaces_created_by_idx on public.workspaces(created_by);
create index if not exists tracked_projects_created_by_idx on public.tracked_projects(created_by);
create index if not exists data_sources_workspace_id_idx on public.data_sources(workspace_id);
create index if not exists data_sources_project_id_idx on public.data_sources(project_id);
create index if not exists data_sources_created_by_idx on public.data_sources(created_by);
create index if not exists events_workspace_id_idx on public.events(workspace_id);
create index if not exists events_project_id_idx on public.events(project_id);
create index if not exists daily_metrics_workspace_id_idx on public.daily_metrics(workspace_id);
create index if not exists dashboards_workspace_id_idx on public.dashboards(workspace_id);
create index if not exists dashboards_created_by_idx on public.dashboards(created_by);
create index if not exists dashboard_widgets_dashboard_id_idx on public.dashboard_widgets(dashboard_id);
create index if not exists alerts_workspace_id_idx on public.alerts(workspace_id);
create index if not exists alerts_project_id_idx on public.alerts(project_id);
create index if not exists alerts_created_by_idx on public.alerts(created_by);
create index if not exists integration_connections_workspace_id_idx on public.integration_connections(workspace_id);
create index if not exists integration_connections_project_id_idx on public.integration_connections(project_id);
create index if not exists integration_connections_created_by_idx on public.integration_connections(created_by);
create index if not exists api_keys_workspace_id_idx on public.api_keys(workspace_id);
create index if not exists api_keys_project_id_idx on public.api_keys(project_id);
create index if not exists api_keys_created_by_idx on public.api_keys(created_by);
create index if not exists ai_insights_workspace_id_idx on public.ai_insights(workspace_id);
create index if not exists ai_insights_project_id_idx on public.ai_insights(project_id);
create index if not exists audit_logs_workspace_id_idx on public.audit_logs(workspace_id);
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);

do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  execute 'revoke execute on function public.rls_auto_enable() from public,anon,authenticated';
 end if;
end $$;
