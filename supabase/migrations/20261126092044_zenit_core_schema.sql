-- ZENIT core multi-tenant schema.
-- Applied to Supabase project Winner as migration zenit_core_schema.
create extension if not exists pgcrypto;

create type public.workspace_role as enum ('owner','admin','member','viewer');
create type public.project_platform as enum ('website','web_app','mobile_app','ecommerce','saas','other');
create type public.source_type as enum ('sdk','rest_api','webhook','ga4','shopify','woocommerce','meta_ads','youtube','other');
create type public.alert_status as enum ('active','paused','resolved');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text, avatar_url text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=''
as $$ begin
 insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do nothing;
 return new;
end $$;
revoke all on function public.handle_new_user() from public,anon,authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table public.workspaces (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(name) between 2 and 80),
 slug text not null unique,
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.workspace_members (
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role public.workspace_role not null default 'member',
 created_at timestamptz not null default now(),
 primary key(workspace_id,user_id)
);
create table public.tracked_projects (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 name text not null, platform public.project_platform not null default 'website',
 website_url text, timezone text not null default 'UTC', currency_code char(3) not null default 'USD',
 is_active boolean not null default true, created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.data_sources (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_id uuid references public.tracked_projects(id) on delete set null,
 name text not null, source public.source_type not null,
 status text not null default 'pending' check(status in ('pending','connected','error','paused')),
 config jsonb not null default '{}'::jsonb, last_synced_at timestamptz,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.events (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_id uuid not null references public.tracked_projects(id) on delete cascade,
 event_name text not null check(char_length(event_name) between 1 and 120),
 event_time timestamptz not null default now(), anonymous_id text, user_id text, session_id text,
 page_url text, referrer text, properties jsonb not null default '{}'::jsonb,
 received_at timestamptz not null default now()
);
create table public.daily_metrics (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_id uuid not null references public.tracked_projects(id) on delete cascade,
 metric_key text not null, metric_date date not null, metric_value numeric not null default 0,
 dimensions jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
 unique(project_id,metric_key,metric_date,dimensions)
);
create table public.dashboards (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 name text not null, description text, is_default boolean not null default false,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.dashboard_widgets (
 id uuid primary key default gen_random_uuid(),
 dashboard_id uuid not null references public.dashboards(id) on delete cascade,
 widget_type text not null, title text not null,
 position jsonb not null default '{"x":0,"y":0,"w":6,"h":4}'::jsonb,
 settings jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.alerts (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_id uuid references public.tracked_projects(id) on delete cascade,
 name text not null, condition jsonb not null default '{}'::jsonb,
 status public.alert_status not null default 'active',
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.integration_connections (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_id uuid references public.tracked_projects(id) on delete cascade,
 provider public.source_type not null, display_name text not null, external_account_id text,
 status text not null default 'pending' check(status in ('pending','connected','expired','error','revoked')),
 secret_reference text, scopes text[] not null default '{}', last_synced_at timestamptz,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.api_keys (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_id uuid references public.tracked_projects(id) on delete cascade,
 label text not null, key_prefix text not null, key_hash text not null unique,
 last_used_at timestamptz, revoked_at timestamptz,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.ai_insights (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_id uuid references public.tracked_projects(id) on delete cascade,
 title text not null, summary text not null, evidence jsonb not null default '{}'::jsonb,
 recommendations jsonb not null default '[]'::jsonb, model_name text,
 generated_at timestamptz not null default now()
);
create table public.audit_logs (
 id bigint generated always as identity primary key,
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null, action text not null,
 resource_type text, resource_id text, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.tracked_projects enable row level security;
alter table public.data_sources enable row level security;
alter table public.events enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.dashboards enable row level security;
alter table public.dashboard_widgets enable row level security;
alter table public.alerts enable row level security;
alter table public.integration_connections enable row level security;
alter table public.api_keys enable row level security;
alter table public.ai_insights enable row level security;
alter table public.audit_logs enable row level security;

create policy profile_select_own on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profile_update_own on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy workspace_select_member on public.workspaces for select to authenticated using(exists(select 1 from public.workspace_members m where m.workspace_id=id and m.user_id=(select auth.uid())));
create policy workspace_insert_creator on public.workspaces for insert to authenticated with check(created_by=(select auth.uid()));
create policy workspace_update_creator on public.workspaces for update to authenticated using(created_by=(select auth.uid())) with check(created_by=(select auth.uid()));
create policy membership_select_self on public.workspace_members for select to authenticated using(user_id=(select auth.uid()));
create policy projects_member_all on public.tracked_projects for all to authenticated using(exists(select 1 from public.workspace_members m where m.workspace_id=workspace_id and m.user_id=(select auth.uid()))) with check(exists(select 1 from public.workspace_members m where m.workspace_id=workspace_id and m.user_id=(select auth.uid())));
create policy sources_member_all on public.data_sources for all to authenticated using(exists(select 1 from public.workspace_members m where m.workspace_id=workspace_id and m.user_id=(select auth.uid()))) with check(exists(select 1 from public.workspace_members m where m.workspace_id=workspace_id and m.user_id=(select auth.uid())));
create policy events_member_read on public.events for select to authenticated using(exists(select 1 from public.workspace_members m where m.workspace_id=workspace_id and m.user_id=(select auth.uid())));
create policy metrics_member_read on public.daily_metrics for select to authenticated using(exists(select 1 from public.workspace_members m where m.workspace_id=workspace_id and m.user_id=(select auth.uid())));
create policy dashboards_member_all on public.dashboards for all to authenticated using(exists(select 1 from public.workspace_members m where m.workspace_id=workspace_id and m.user_id=(select auth.uid()))) with check(exists(select 1 from public.workspace_members m where m.workspace_id=workspace_id and m.user_id=(select auth.uid())));
create policy widgets_member_all on public.dashboard_widgets for all to authenticated using(exists(select 1 from public.dashboards d join public.workspace_members m on m.workspace_id=d.workspace_id where d.id=dashboard_id and m.user_id=(select auth.uid()))) with check(exists(select 1 from public.dashboards d join public.workspace_members m on m.workspace_id=d.workspace_id where d.id=dashboard_id and m.user_id=(select auth.uid())));
create policy alerts_member_all on public.alerts for all to authenticated using(exists(select 1 from public.workspace_members m where m.workspace_id=workspace_id and m.user_id=(select auth.uid()))) with check(exists(select 1 from public.workspace_members m where m.workspace_id=workspace_id and m.user_id=(select auth.uid())));
create policy integrations_member_all on public.integration_connections for all to authenticated using(exists(select 1 from public.workspace_members m where m.workspace_id=workspace_id and m.user_id=(select auth.uid()))) with check(exists(select 1 from public.workspace_members m where m.workspace_id=workspace_id and m.user_id=(select auth.uid())));
create policy api_keys_member_read on public.api_keys for select to authenticated using(exists(select 1 from public.workspace_members m where m.workspace_id=workspace_id and m.user_id=(select auth.uid())));
create policy ai_insights_member_read on public.ai_insights for select to authenticated using(exists(select 1 from public.workspace_members m where m.workspace_id=workspace_id and m.user_id=(select auth.uid())));
create policy audit_logs_member_read on public.audit_logs for select to authenticated using(exists(select 1 from public.workspace_members m where m.workspace_id=workspace_id and m.user_id=(select auth.uid())));

grant select,insert,update,delete on public.profiles,public.workspaces,public.workspace_members,public.tracked_projects,public.data_sources,public.events,public.daily_metrics,public.dashboards,public.dashboard_widgets,public.alerts,public.integration_connections,public.api_keys,public.ai_insights,public.audit_logs to authenticated;
grant usage,select on sequence public.audit_logs_id_seq to authenticated;
