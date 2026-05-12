-- Together Life v21
-- 차량관리 + 맛집/가본곳/카페 기록 기능용 DB 업데이트입니다.
-- Supabase SQL Editor에서 실행하세요.

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.life_groups(id) on delete cascade,
  name text not null,
  plate_number text,
  current_km numeric not null default 0,
  memo text,
  created_at timestamp with time zone default now()
);

create table if not exists public.vehicle_maintenance_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.life_groups(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  item_name text not null,
  interval_km numeric not null default 0,
  last_service_km numeric not null default 0,
  last_service_date date,
  memo text,
  created_at timestamp with time zone default now()
);

create table if not exists public.place_records (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.life_groups(id) on delete cascade,
  name text not null,
  place_type text not null default 'restaurant',
  visit_date date,
  address text,
  google_maps_url text,
  rating numeric default 0,
  memo text,
  created_at timestamp with time zone default now()
);

alter table public.place_records
  drop constraint if exists place_records_place_type_check;

alter table public.place_records
  add constraint place_records_place_type_check
  check (place_type in ('restaurant', 'cafe', 'visited', 'wishlist'));

alter table public.vehicles enable row level security;
alter table public.vehicle_maintenance_items enable row level security;
alter table public.place_records enable row level security;

-- 기존 정책이 있으면 제거 후 다시 생성합니다.
drop policy if exists "vehicles_group_members_select" on public.vehicles;
drop policy if exists "vehicles_group_members_insert" on public.vehicles;
drop policy if exists "vehicles_group_members_update" on public.vehicles;
drop policy if exists "vehicles_group_members_delete" on public.vehicles;

drop policy if exists "vehicle_maintenance_group_members_select" on public.vehicle_maintenance_items;
drop policy if exists "vehicle_maintenance_group_members_insert" on public.vehicle_maintenance_items;
drop policy if exists "vehicle_maintenance_group_members_update" on public.vehicle_maintenance_items;
drop policy if exists "vehicle_maintenance_group_members_delete" on public.vehicle_maintenance_items;

drop policy if exists "place_records_group_members_select" on public.place_records;
drop policy if exists "place_records_group_members_insert" on public.place_records;
drop policy if exists "place_records_group_members_update" on public.place_records;
drop policy if exists "place_records_group_members_delete" on public.place_records;

create policy "vehicles_group_members_select"
on public.vehicles for select
using (public.is_life_group_member(group_id));

create policy "vehicles_group_members_insert"
on public.vehicles for insert
with check (public.is_life_group_member(group_id));

create policy "vehicles_group_members_update"
on public.vehicles for update
using (public.is_life_group_member(group_id))
with check (public.is_life_group_member(group_id));

create policy "vehicles_group_members_delete"
on public.vehicles for delete
using (public.is_life_group_member(group_id));

create policy "vehicle_maintenance_group_members_select"
on public.vehicle_maintenance_items for select
using (public.is_life_group_member(group_id));

create policy "vehicle_maintenance_group_members_insert"
on public.vehicle_maintenance_items for insert
with check (public.is_life_group_member(group_id));

create policy "vehicle_maintenance_group_members_update"
on public.vehicle_maintenance_items for update
using (public.is_life_group_member(group_id))
with check (public.is_life_group_member(group_id));

create policy "vehicle_maintenance_group_members_delete"
on public.vehicle_maintenance_items for delete
using (public.is_life_group_member(group_id));

create policy "place_records_group_members_select"
on public.place_records for select
using (public.is_life_group_member(group_id));

create policy "place_records_group_members_insert"
on public.place_records for insert
with check (public.is_life_group_member(group_id));

create policy "place_records_group_members_update"
on public.place_records for update
using (public.is_life_group_member(group_id))
with check (public.is_life_group_member(group_id));

create policy "place_records_group_members_delete"
on public.place_records for delete
using (public.is_life_group_member(group_id));

notify pgrst, 'reload schema';
