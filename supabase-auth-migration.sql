alter table public.trip_shares
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

create index if not exists trip_shares_owner_user_id_idx
  on public.trip_shares(owner_user_id);

create or replace function public.create_my_trip_share(p_payload jsonb)
returns table(id uuid, viewer_token uuid)
language sql
security definer
set search_path = ''
as $$
  insert into public.trip_shares(owner_user_id, payload)
  values (auth.uid(), p_payload)
  returning trip_shares.id, trip_shares.viewer_token;
$$;

create or replace function public.list_my_trip_shares()
returns table(id uuid, viewer_token uuid, payload jsonb, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.viewer_token, s.payload, s.updated_at
  from public.trip_shares s
  where s.owner_user_id = auth.uid()
  order by s.updated_at desc;
$$;

create or replace function public.update_my_trip_share(p_id uuid, p_payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.trip_shares
  set payload = p_payload, updated_at = now()
  where id = p_id and owner_user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.claim_trip_share(p_id uuid, p_owner_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.trip_shares
  set owner_user_id = auth.uid(), updated_at = now()
  where id = p_id and owner_token = p_owner_token and owner_user_id is null;
  return found;
end;
$$;

create or replace function public.rotate_my_viewer_token(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare new_token uuid := gen_random_uuid();
begin
  update public.trip_shares
  set viewer_token = new_token, updated_at = now()
  where id = p_id and owner_user_id = auth.uid();
  if not found then return null; end if;
  return new_token;
end;
$$;

revoke all on function public.create_my_trip_share(jsonb) from public;
revoke all on function public.list_my_trip_shares() from public;
revoke all on function public.update_my_trip_share(uuid, jsonb) from public;
revoke all on function public.claim_trip_share(uuid, uuid) from public;
revoke all on function public.rotate_my_viewer_token(uuid) from public;
grant execute on function public.create_my_trip_share(jsonb) to authenticated;
grant execute on function public.list_my_trip_shares() to authenticated;
grant execute on function public.update_my_trip_share(uuid, jsonb) to authenticated;
grant execute on function public.claim_trip_share(uuid, uuid) to authenticated;
grant execute on function public.rotate_my_viewer_token(uuid) to authenticated;