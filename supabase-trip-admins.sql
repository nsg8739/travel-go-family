-- 선택한 여행별 공동 관리자 기능
-- Supabase SQL Editor에서 전체 실행하세요. 기존 여행 데이터는 삭제하지 않습니다.
create table if not exists public.trip_share_admins (
  share_id uuid not null references public.trip_shares(id) on delete cascade,
  admin_email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (share_id, admin_email),
  constraint trip_share_admin_email_normalized check (admin_email = lower(trim(admin_email)))
);
alter table public.trip_share_admins enable row level security;
revoke all on public.trip_share_admins from anon, authenticated;

drop function if exists public.list_my_trip_shares();
create function public.list_my_trip_shares()
returns table(id uuid, viewer_token uuid, payload jsonb, updated_at timestamptz, is_owner boolean)
language sql stable security definer set search_path = public, pg_catalog
as $$
  select s.id, s.viewer_token, s.payload, s.updated_at, s.owner_user_id = auth.uid()
  from public.trip_shares s
  where auth.uid() is not null and (
    s.owner_user_id = auth.uid() or exists (
      select 1 from public.trip_share_admins a
      where a.share_id = s.id and a.admin_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  order by s.updated_at desc;
$$;

create or replace function public.update_my_trip_share(p_id uuid, p_payload jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update public.trip_shares s set payload = p_payload, updated_at = now()
  where s.id = p_id and (
    s.owner_user_id = auth.uid() or exists (
      select 1 from public.trip_share_admins a
      where a.share_id = s.id and a.admin_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );
  return found;
end;
$$;

create or replace function public.invite_trip_admin(p_id uuid, p_email text)
returns boolean language plpgsql security definer set search_path = public, pg_catalog
as $$
declare normalized_email text := lower(trim(coalesce(p_email, '')));
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if normalized_email = '' then raise exception 'email required'; end if;
  if normalized_email = lower(coalesce(auth.jwt() ->> 'email', '')) then raise exception 'owner cannot be invited'; end if;
  if not exists (select 1 from public.trip_shares where id = p_id and owner_user_id = auth.uid()) then raise exception 'owner permission required'; end if;
  insert into public.trip_share_admins(share_id, admin_email, invited_by)
  values (p_id, normalized_email, auth.uid())
  on conflict (share_id, admin_email) do nothing;
  return true;
end;
$$;

create or replace function public.list_trip_admins(p_id uuid)
returns table(admin_email text, created_at timestamptz)
language sql stable security definer set search_path = public, pg_catalog
as $$
  select a.admin_email, a.created_at from public.trip_share_admins a
  join public.trip_shares s on s.id = a.share_id
  where a.share_id = p_id and s.owner_user_id = auth.uid()
  order by a.created_at;
$$;

create or replace function public.remove_trip_admin(p_id uuid, p_email text)
returns boolean language plpgsql security definer set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  delete from public.trip_share_admins a using public.trip_shares s
  where a.share_id = p_id and a.admin_email = lower(trim(p_email))
    and s.id = a.share_id and s.owner_user_id = auth.uid();
  return found;
end;
$$;

grant execute on function public.list_my_trip_shares() to authenticated;
grant execute on function public.update_my_trip_share(uuid, jsonb) to authenticated;
grant execute on function public.invite_trip_admin(uuid, text) to authenticated;
grant execute on function public.list_trip_admins(uuid) to authenticated;
grant execute on function public.remove_trip_admin(uuid, text) to authenticated;
notify pgrst, 'reload schema';

select p.proname as installed_function
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('list_my_trip_shares','update_my_trip_share','invite_trip_admin','list_trip_admins','remove_trip_admin')
order by p.proname;