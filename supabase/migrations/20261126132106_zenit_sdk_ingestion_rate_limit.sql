create table if not exists private.api_key_rate_limits (
  api_key_id uuid primary key references public.api_keys(id) on delete cascade,
  window_started_at timestamptz not null default date_trunc('minute',now()),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);
alter table private.api_key_rate_limits enable row level security;
revoke all on private.api_key_rate_limits from public, anon, authenticated;

create or replace function private.zenit_ingest_events(p_api_key text,p_events jsonb,p_origin text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_key public.api_keys%rowtype;
  v_project public.tracked_projects%rowtype;
  v_event jsonb;
  v_count integer := 0;
  v_requests integer;
  v_origin_host text;
  v_project_host text;
  v_window timestamptz := date_trunc('minute',now());
begin
  if p_api_key is null or length(p_api_key) < 40 or length(p_api_key) > 100 then raise exception 'Invalid API key'; end if;
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) < 1 or jsonb_array_length(p_events) > 50 then raise exception 'Send between 1 and 50 events per request'; end if;
  select * into v_key from public.api_keys where key_hash=encode(extensions.digest(p_api_key,'sha256'),'hex') and revoked_at is null limit 1;
  if v_key.id is null or v_key.project_id is null then raise exception 'Invalid or revoked API key'; end if;
  select * into v_project from public.tracked_projects where id=v_key.project_id and workspace_id=v_key.workspace_id and is_active=true;
  if v_project.id is null then raise exception 'Tracked project is unavailable'; end if;
  if p_origin is not null and length(trim(p_origin)) > 0 then
    v_origin_host := split_part(regexp_replace(lower(trim(p_origin)),'^https?://',''), '/', 1);
    v_project_host := split_part(regexp_replace(lower(trim(coalesce(v_project.website_url,''))),'^https?://',''), '/', 1);
    if v_project_host = '' or v_origin_host <> v_project_host then raise exception 'Origin is not authorized for this project'; end if;
  end if;
  insert into private.api_key_rate_limits(api_key_id,window_started_at,request_count,updated_at)
  values(v_key.id,v_window,1,now())
  on conflict(api_key_id) do update set
    window_started_at=case when private.api_key_rate_limits.window_started_at < v_window then v_window else private.api_key_rate_limits.window_started_at end,
    request_count=case when private.api_key_rate_limits.window_started_at < v_window then 1 else private.api_key_rate_limits.request_count+1 end,
    updated_at=now()
  returning request_count into v_requests;
  if v_requests > 120 then raise exception 'Rate limit exceeded: try again next minute'; end if;
  for v_event in select value from jsonb_array_elements(p_events)
  loop
    if jsonb_typeof(v_event) <> 'object' or length(trim(coalesce(v_event->>'name',''))) < 1 or length(v_event->>'name') > 120
      or (v_event ? 'properties' and jsonb_typeof(v_event->'properties') not in ('object','null'))
      or octet_length(coalesce(v_event->'properties','{}'::jsonb)::text) > 8192 then raise exception 'Invalid event payload'; end if;
    insert into public.events(workspace_id,project_id,event_name,event_time,anonymous_id,user_id,session_id,page_url,referrer,properties)
    values(v_key.workspace_id,v_key.project_id,trim(v_event->>'name'),coalesce(nullif(v_event->>'timestamp','')::timestamptz,now()),
      left(v_event->>'anonymous_id',128),left(v_event->>'user_id',128),left(v_event->>'session_id',128),
      left(v_event->>'url',2048),left(v_event->>'referrer',2048),
      case when jsonb_typeof(v_event->'properties')='object' then v_event->'properties' else '{}'::jsonb end);
    v_count := v_count + 1;
  end loop;
  update public.api_keys set last_used_at=now() where id=v_key.id;
  return jsonb_build_object('accepted',v_count,'rate_limit_per_minute',120);
end;
$$;
