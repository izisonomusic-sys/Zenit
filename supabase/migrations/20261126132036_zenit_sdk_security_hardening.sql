-- Keep public RPC wrappers as SECURITY INVOKER. Privileged logic remains in private SECURITY DEFINER functions.
drop index if exists public.api_keys_key_hash_uidx;

alter function public.zenit_create_sdk_key(uuid,text,text,text) security invoker;
alter function public.zenit_revoke_sdk_key(uuid) security invoker;
alter function public.zenit_ingest_events(text,jsonb,text) security invoker;

grant usage on schema private to anon, authenticated;
grant execute on function private.zenit_create_sdk_key(uuid,text,text,text) to authenticated;
grant execute on function private.zenit_revoke_sdk_key(uuid) to authenticated;
grant execute on function private.zenit_ingest_events(text,jsonb,text) to anon, authenticated;

revoke all on function public.zenit_create_sdk_key(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.zenit_revoke_sdk_key(uuid) from public, anon, authenticated;
revoke all on function public.zenit_ingest_events(text,jsonb,text) from public, anon, authenticated;
grant execute on function public.zenit_create_sdk_key(uuid,text,text,text) to authenticated;
grant execute on function public.zenit_revoke_sdk_key(uuid) to authenticated;
grant execute on function public.zenit_ingest_events(text,jsonb,text) to anon, authenticated;
