create extension if not exists pgcrypto;

create table if not exists public.trip_shares (
  id uuid primary key default gen_random_uuid(),
  owner_token uuid not null default gen_random_uuid(),
  viewer_token uuid not null default gen_random_uuid(),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.trip_shares enable row level security;
revoke all on table public.trip_shares from anon, authenticated;

create or replace function public.create_trip_share(p_payload jsonb)
returns table(id uuid, owner_token uuid, viewer_token uuid)
language sql
security definer
set search_path = ''
as $$
  insert into public.trip_shares(payload)
  values (p_payload)
  returning trip_shares.id, trip_shares.owner_token, trip_shares.viewer_token;
$$;

create or replace function public.read_trip_share(p_id uuid, p_viewer_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select payload
  from public.trip_shares
  where id = p_id and viewer_token = p_viewer_token
  limit 1;
$$;

create or replace function public.update_trip_share(p_id uuid, p_owner_token uuid, p_payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.trip_shares
  set payload = p_payload, updated_at = now()
  where id = p_id and owner_token = p_owner_token;
  return found;
end;
$$;

revoke all on function public.create_trip_share(jsonb) from public;
revoke all on function public.read_trip_share(uuid, uuid) from public;
revoke all on function public.update_trip_share(uuid, uuid, jsonb) from public;
grant execute on function public.create_trip_share(jsonb) to anon, authenticated;
grant execute on function public.read_trip_share(uuid, uuid) to anon, authenticated;
grant execute on function public.update_trip_share(uuid, uuid, jsonb) to anon, authenticated;