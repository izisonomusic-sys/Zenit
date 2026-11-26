-- ZENIT SDK event ingestion and project-scoped API keys
create unique index if not exists api_keys_key_hash_uidx on public.api_keys(key_hash);

create or replace function private.zenit_create_sdk_key(
  p_project_id uuid,
  p_label text,
  p_key_prefix text,
  p_key_hash text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_workspace uuid;
  v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(p_label,''))) < 2 or length(p_label) > 80 then raise exception 'Invalid API key label'; end if;
  if p_key_prefix !~ '^zn_live_[A-Za-z0-9_-]{6,12}$' or p_key_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid API key material'; end if;
  select p.workspace_id into v_workspace
  from public.tracked_projects p
  join public.workspace_members m on m.workspace_id=p.workspace_id
  where p.id=p_project_id and m.user_id=v_user and m.role in ('owner','admin');
  if v_workspace is null then raise exception 'Project administrator permission required'; end if;
  insert into public.api_keys(workspace_id,project_id,label,key_prefix,key_hash,created_by)
  values(v_workspace,p_project_id,trim(p_label),p_key_prefix,p_key_hash,v_user)
  returning id into v_id;
  if not exists(select 1 from public.data_sources s where s.workspace_id=v_workspace and s.project_id=p_project_id and s.source='sdk'::public.source_type) then
    insert into public.data_sources(workspace_id,project_id,name,source,status,config,created_by)
    values(v_workspace,p_project_id,'ZENIT SDK','sdk','connected',jsonb_build_object('provider','zenit_sdk','project_id',p_project_id,'connection_method','javascript_sdk'),v_user);
  else
    update public.data_sources set status='connected',updated_at=now()
    where workspace_id=v_workspace and project_id=p_project_id and source='sdk'::public.source_type;
  end if;
  return v_id;
end;
$$;

create or replace function private.zenit_revoke_sdk_key(p_key_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_workspace uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select k.workspace_id into v_workspace
  from public.api_keys k
  join public.workspace_members m on m.workspace_id=k.workspace_id
  where k.id=p_key_id and m.user_id=v_user and m.role in ('owner','admin');
  if v_workspace is null then raise exception 'Project administrator permission required'; end if;
  update public.api_keys set revoked_at=now() where id=p_key_id and revoked_at is null;
  return found;
end;
$$;

create or replace function private.zenit_ingest_events(p_api_key text,p_events jsonb,p_origin text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key public.api_keys%rowtype;
  v_project public.tracked_projects%rowtype;
  v_event jsonb;
  v_count integer := 0;
  v_origin_host text;
  v_project_host text;
begin
  if p_api_key is null or length(p_api_key) < 40 or length(p_api_key) > 100 then raise exception 'Invalid API key'; end if;
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) < 1 or jsonb_array_length(p_events) > 50 then raise exception 'Send between 1 and 50 events per request'; end if;
  select * into v_key from public.api_keys
  where key_hash=encode(extensions.digest(p_api_key,'sha256'),'hex') and revoked_at is null limit 1;
  if v_key.id is null or v_key.project_id is null then raise exception 'Invalid or revoked API key'; end if;
  select * into v_project from public.tracked_projects where id=v_key.project_id and workspace_id=v_key.workspace_id and is_active=true;
  if v_project.id is null then raise exception 'Tracked project is unavailable'; end if;
  if p_origin is not null and length(trim(p_origin)) > 0 then
    v_origin_host := split_part(regexp_replace(lower(trim(p_origin)),'^https?://',''), '/', 1);
    v_project_host := split_part(regexp_replace(lower(trim(coalesce(v_project.website_url,''))),'^https?://',''), '/', 1);
    if v_project_host = '' or v_origin_host <> v_project_host then raise exception 'Origin is not authorized for this project'; end if;
  end if;
  for v_event in select value from jsonb_array_elements(p_events)
  loop
    if jsonb_typeof(v_event) <> 'object'
      or length(trim(coalesce(v_event->>'name',''))) < 1
      or length(v_event->>'name') > 120
      or (v_event ? 'properties' and jsonb_typeof(v_event->'properties') not in ('object','null'))
      or octet_length(coalesce(v_event->'properties','{}'::jsonb)::text) > 8192 then raise exception 'Invalid event payload'; end if;
    insert into public.events(workspace_id,project_id,event_name,event_time,anonymous_id,user_id,session_id,page_url,referrer,properties)
    values (
      v_key.workspace_id,v_key.project_id,trim(v_event->>'name'),
      coalesce(nullif(v_event->>'timestamp','')::timestamptz,now()),
      left(v_event->>'anonymous_id',128),left(v_event->>'user_id',128),left(v_event->>'session_id',128),
      left(v_event->>'url',2048),left(v_event->>'referrer',2048),
      case when jsonb_typeof(v_event->'properties')='object' then v_event->'properties' else '{}'::jsonb end
    );
    v_count := v_count + 1;
  end loop;
  update public.api_keys set last_used_at=now() where id=v_key.id;
  return jsonb_build_object('accepted',v_count);
end;
$$;

create or replace function public.zenit_create_sdk_key(p_project_id uuid,p_label text,p_key_prefix text,p_key_hash text)
returns uuid language sql security definer set search_path = ''
as $$ select private.zenit_create_sdk_key(p_project_id,p_label,p_key_prefix,p_key_hash); $$;
create or replace function public.zenit_revoke_sdk_key(p_key_id uuid)
returns boolean language sql security definer set search_path = ''
as $$ select private.zenit_revoke_sdk_key(p_key_id); $$;
create or replace function public.zenit_ingest_events(p_api_key text,p_events jsonb,p_origin text default null)
returns jsonb language sql security definer set search_path = ''
as $$ select private.zenit_ingest_events(p_api_key,p_events,p_origin); $$;

revoke all on function private.zenit_create_sdk_key(uuid,text,text,text) from public, anon, authenticated;
revoke all on function private.zenit_revoke_sdk_key(uuid) from public, anon, authenticated;
revoke all on function private.zenit_ingest_events(text,jsonb,text) from public, anon, authenticated;
revoke all on function public.zenit_create_sdk_key(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.zenit_revoke_sdk_key(uuid) from public, anon, authenticated;
revoke all on function public.zenit_ingest_events(text,jsonb,text) from public, anon, authenticated;
grant execute on function public.zenit_create_sdk_key(uuid,text,text,text) to authenticated;
grant execute on function public.zenit_revoke_sdk_key(uuid) to authenticated;
grant execute on function public.zenit_ingest_events(text,jsonb,text) to anon, authenticated;

comment on function public.zenit_ingest_events(text,jsonb,text) is 'Public ingestion endpoint. Authenticates using a project-scoped hashed ZENIT SDK key and validates browser origin against the tracked project domain.';
