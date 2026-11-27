-- Do not label SDK/API sources connected when a key is merely created.
-- First accepted event is the moment the source becomes connected.
create or replace function private.zenit_create_api_key(
  p_project_id uuid,
  p_label text,
  p_key_type text,
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
  v_has_events boolean;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(p_label,''))) < 2 or length(p_label) > 80 then raise exception 'Invalid API key label'; end if;
  if p_key_type not in ('public','secret') then raise exception 'Invalid key type'; end if;
  if p_key_type='public' and p_key_prefix !~ '^zn_pub_[A-Za-z0-9_-]{6,12}$' then raise exception 'Invalid public key prefix'; end if;
  if p_key_type='secret' and p_key_prefix !~ '^zn_sec_[A-Za-z0-9_-]{6,12}$' then raise exception 'Invalid secret key prefix'; end if;
  if p_key_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid API key hash'; end if;
  select p.workspace_id into v_workspace
  from public.tracked_projects p join public.workspace_members m on m.workspace_id=p.workspace_id
  where p.id=p_project_id and m.user_id=v_user and m.role in ('owner','admin');
  if v_workspace is null then raise exception 'Project administrator permission required'; end if;
  insert into public.api_keys(workspace_id,project_id,label,key_prefix,key_hash,key_type,created_by)
  values(v_workspace,p_project_id,trim(p_label),p_key_prefix,p_key_hash,p_key_type,v_user)
  returning id into v_id;
  if p_key_type='public' then
    select exists(select 1 from public.events e where e.workspace_id=v_workspace and e.project_id=p_project_id) into v_has_events;
    if not exists(select 1 from public.data_sources s where s.workspace_id=v_workspace and s.project_id=p_project_id and s.source='sdk'::public.source_type) then
      insert into public.data_sources(workspace_id,project_id,name,source,status,config,last_synced_at,created_by)
      values(v_workspace,p_project_id,'ZENIT SDK','sdk',case when v_has_events then 'connected' else 'pending' end,
        jsonb_build_object('provider','zenit_sdk','project_id',p_project_id,'connection_method','javascript_sdk'),
        (select max(e.received_at) from public.events e where e.workspace_id=v_workspace and e.project_id=p_project_id),v_user);
    else
      update public.data_sources
      set status=case when v_has_events then 'connected' else 'pending' end,
          last_synced_at=case when v_has_events then (select max(e.received_at) from public.events e where e.workspace_id=v_workspace and e.project_id=p_project_id) else null end,
          updated_at=now()
      where workspace_id=v_workspace and project_id=p_project_id and source='sdk'::public.source_type;
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function private.zenit_touch_data_sources_on_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.data_sources
  set status='connected', last_synced_at=coalesce(new.received_at,now()), updated_at=now()
  where workspace_id=new.workspace_id and project_id=new.project_id and status <> 'paused';
  return new;
end;
$$;

update public.data_sources s
set status='pending', last_synced_at=null, updated_at=now()
where s.source='sdk'::public.source_type
  and not exists(select 1 from public.events e where e.workspace_id=s.workspace_id and e.project_id=s.project_id);
