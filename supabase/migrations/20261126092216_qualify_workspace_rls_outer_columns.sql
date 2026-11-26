-- Always correlate each membership lookup to the outer row's workspace_id.
drop policy if exists projects_member_all on public.tracked_projects;
create policy projects_member_all on public.tracked_projects for all to authenticated
using(exists(select 1 from public.workspace_members m where m.workspace_id=tracked_projects.workspace_id and m.user_id=(select auth.uid())))
with check(exists(select 1 from public.workspace_members m where m.workspace_id=tracked_projects.workspace_id and m.user_id=(select auth.uid())));
drop policy if exists sources_member_all on public.data_sources;
create policy sources_member_all on public.data_sources for all to authenticated
using(exists(select 1 from public.workspace_members m where m.workspace_id=data_sources.workspace_id and m.user_id=(select auth.uid())))
with check(exists(select 1 from public.workspace_members m where m.workspace_id=data_sources.workspace_id and m.user_id=(select auth.uid())));
drop policy if exists events_member_read on public.events;
create policy events_member_read on public.events for select to authenticated
using(exists(select 1 from public.workspace_members m where m.workspace_id=events.workspace_id and m.user_id=(select auth.uid())));
drop policy if exists metrics_member_read on public.daily_metrics;
create policy metrics_member_read on public.daily_metrics for select to authenticated
using(exists(select 1 from public.workspace_members m where m.workspace_id=daily_metrics.workspace_id and m.user_id=(select auth.uid())));
drop policy if exists dashboards_member_all on public.dashboards;
create policy dashboards_member_all on public.dashboards for all to authenticated
using(exists(select 1 from public.workspace_members m where m.workspace_id=dashboards.workspace_id and m.user_id=(select auth.uid())))
with check(exists(select 1 from public.workspace_members m where m.workspace_id=dashboards.workspace_id and m.user_id=(select auth.uid())));
drop policy if exists widgets_member_all on public.dashboard_widgets;
create policy widgets_member_all on public.dashboard_widgets for all to authenticated
using(exists(select 1 from public.dashboards d join public.workspace_members m on m.workspace_id=d.workspace_id where d.id=dashboard_widgets.dashboard_id and m.user_id=(select auth.uid())))
with check(exists(select 1 from public.dashboards d join public.workspace_members m on m.workspace_id=d.workspace_id where d.id=dashboard_widgets.dashboard_id and m.user_id=(select auth.uid())));
drop policy if exists alerts_member_all on public.alerts;
create policy alerts_member_all on public.alerts for all to authenticated
using(exists(select 1 from public.workspace_members m where m.workspace_id=alerts.workspace_id and m.user_id=(select auth.uid())))
with check(exists(select 1 from public.workspace_members m where m.workspace_id=alerts.workspace_id and m.user_id=(select auth.uid())));
drop policy if exists integrations_member_all on public.integration_connections;
create policy integrations_member_all on public.integration_connections for all to authenticated
using(exists(select 1 from public.workspace_members m where m.workspace_id=integration_connections.workspace_id and m.user_id=(select auth.uid())))
with check(exists(select 1 from public.workspace_members m where m.workspace_id=integration_connections.workspace_id and m.user_id=(select auth.uid())));
drop policy if exists api_keys_member_read on public.api_keys;
create policy api_keys_member_read on public.api_keys for select to authenticated
using(exists(select 1 from public.workspace_members m where m.workspace_id=api_keys.workspace_id and m.user_id=(select auth.uid())));
drop policy if exists ai_insights_member_read on public.ai_insights;
create policy ai_insights_member_read on public.ai_insights for select to authenticated
using(exists(select 1 from public.workspace_members m where m.workspace_id=ai_insights.workspace_id and m.user_id=(select auth.uid())));
drop policy if exists audit_logs_member_read on public.audit_logs;
create policy audit_logs_member_read on public.audit_logs for select to authenticated
using(exists(select 1 from public.workspace_members m where m.workspace_id=audit_logs.workspace_id and m.user_id=(select auth.uid())));
