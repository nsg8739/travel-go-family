create or replace function public.claim_trip_share(
  p_id uuid,
  p_owner_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  update public.trip_shares
  set owner_user_id = auth.uid(), updated_at = now()
  where id = p_id
    and owner_token = p_owner_token
    and owner_user_id is null;

  return found;
end;
$$;

revoke all on function public.claim_trip_share(uuid, uuid) from public;
grant execute on function public.claim_trip_share(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
