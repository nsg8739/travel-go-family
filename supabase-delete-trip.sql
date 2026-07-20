create or replace function public.delete_my_trip_share(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  delete from public.trip_shares
  where id = p_id and owner_user_id = auth.uid();

  return found;
end;
$$;

grant execute on function public.delete_my_trip_share(uuid) to authenticated;
notify pgrst, 'reload schema';

select p.proname as installed_function
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'delete_my_trip_share';
