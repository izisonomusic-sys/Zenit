-- Keep connected data-source freshness aligned with accepted event ingestion.
create or replace function private.zenit_touch_data_sources_on_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.data_sources
  set last_synced_at = coalesce(new.received_at, now()),
      updated_at = now()
  where workspace_id = new.workspace_id
    and project_id = new.project_id
    and status = 'connected';
  return new;
end;
$$;

revoke all on function private.zenit_touch_data_sources_on_event() from public, anon, authenticated;

drop trigger if exists zenit_touch_data_sources_after_event on public.events;
create trigger zenit_touch_data_sources_after_event
after insert on public.events
for each row execute function private.zenit_touch_data_sources_on_event();
