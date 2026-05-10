-- Family Life Manager v2 - full reset schema
-- 새 Supabase 프로젝트 또는 초기화가 필요한 경우에만 전체 실행하세요.
-- 기존 family-life-manager 데이터가 있으면 삭제됩니다.

DROP TABLE IF EXISTS group_invites CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS settlement_records CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS shopping_items CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS fixed_expenses CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS life_groups CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP FUNCTION IF EXISTS public.accept_group_invite(text, text);
DROP FUNCTION IF EXISTS public.is_life_group_editor(uuid);
DROP FUNCTION IF EXISTS public.is_life_group_admin(uuid);
DROP FUNCTION IF EXISTS public.is_life_group_member(uuid);
DROP FUNCTION IF EXISTS public.is_life_group_owner(uuid);

create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamp with time zone default now()
);

create table life_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  group_type text not null default 'family', -- couple / married / family / roommates
  memo text,
  created_at timestamp with time zone default now()
);

create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  role text not null default 'member', -- owner / admin / member / viewer
  member_type text not null default 'real', -- real / display_only
  created_at timestamp with time zone default now()
);

create table group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  code text not null unique,
  role text not null default 'member', -- admin / member / viewer
  memo text,
  is_active boolean not null default true,
  expires_at timestamp with time zone default (now() + interval '14 days'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  name text not null,
  type text not null default 'expense', -- income / expense
  color text default '#4f46e5',
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  name text not null,
  account_type text not null default 'bank', -- bank / cash / credit_card / debit_card / saving
  owner_member_id uuid references group_members(id) on delete set null,
  balance numeric not null default 0,
  memo text,
  created_at timestamp with time zone default now()
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  budget_month date not null,
  name text not null,
  category_id uuid references categories(id) on delete set null,
  limit_amount numeric not null default 0,
  scope text not null default 'shared', -- shared / personal
  created_at timestamp with time zone default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  created_by uuid references auth.users(id) on delete set null,
  type text not null default 'expense', -- income / expense / transfer
  scope text not null default 'shared', -- shared / personal
  title text not null,
  transaction_date date not null default current_date,
  amount numeric not null default 0,
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  paid_by_member_id uuid references group_members(id) on delete set null,
  settlement_required boolean not null default false,
  split_method text not null default 'equal', -- none / equal / manual
  memo text,
  created_at timestamp with time zone default now()
);

create table fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  title text not null,
  start_date date not null default current_date,
  next_payment_date date,
  amount numeric not null default 0,
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  paid_by_member_id uuid references group_members(id) on delete set null,
  repeat_type text not null default 'monthly', -- weekly / monthly / yearly
  is_active boolean not null default true,
  memo text,
  created_at timestamp with time zone default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  title text not null,
  assigned_to_member_id uuid references group_members(id) on delete set null,
  due_date date,
  repeat_type text not null default 'none', -- none / daily / weekly / monthly
  is_done boolean not null default false,
  memo text,
  created_at timestamp with time zone default now()
);

create table shopping_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  item_name text not null,
  quantity text,
  added_by_member_id uuid references group_members(id) on delete set null,
  is_done boolean not null default false,
  memo text,
  created_at timestamp with time zone default now()
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  title text not null,
  target_amount numeric not null default 0,
  current_amount numeric not null default 0,
  target_date date,
  memo text,
  created_at timestamp with time zone default now()
);

create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  title text not null,
  event_date date not null default current_date,
  event_time time,
  assigned_to_member_id uuid references group_members(id) on delete set null,
  repeat_type text not null default 'none', -- none / daily / weekly / monthly / yearly
  is_done boolean not null default false,
  memo text,
  created_at timestamp with time zone default now()
);

create table settlement_records (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  settlement_month date not null default date_trunc('month', now())::date,
  from_member_id uuid references group_members(id) on delete cascade,
  to_member_id uuid references group_members(id) on delete cascade,
  amount numeric not null default 0,
  status text not null default 'pending', -- pending / completed
  memo text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create or replace function public.is_life_group_owner(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from life_groups g
    where g.id = target_group_id and g.owner_id = auth.uid()
  );
$$;

create or replace function public.is_life_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from life_groups g
    where g.id = target_group_id and g.owner_id = auth.uid()
  )
  or exists (
    select 1 from group_members gm
    where gm.group_id = target_group_id and gm.user_id = auth.uid()
  );
$$;

create or replace function public.is_life_group_admin(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from life_groups g
    where g.id = target_group_id and g.owner_id = auth.uid()
  )
  or exists (
    select 1 from group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_life_group_editor(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from life_groups g
    where g.id = target_group_id and g.owner_id = auth.uid()
  )
  or exists (
    select 1 from group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin', 'member')
  );
$$;

create or replace function public.accept_group_invite(invite_code text, member_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row group_invites%rowtype;
  existing_member uuid;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into invite_row
  from group_invites
  where code = upper(trim(invite_code))
    and is_active = true
    and expires_at > now()
  limit 1;

  if not found then
    raise exception '초대코드가 없거나 만료되었습니다.';
  end if;

  select id into existing_member
  from group_members
  where group_id = invite_row.group_id
    and user_id = auth.uid()
  limit 1;

  if existing_member is null then
    insert into group_members (group_id, user_id, display_name, role, member_type)
    values (invite_row.group_id, auth.uid(), coalesce(nullif(trim(member_name), ''), '구성원'), invite_row.role, 'real');
  end if;

  return invite_row.group_id;
end;
$$;

alter table profiles enable row level security;
alter table life_groups enable row level security;
alter table group_members enable row level security;
alter table group_invites enable row level security;
alter table categories enable row level security;
alter table accounts enable row level security;
alter table budgets enable row level security;
alter table transactions enable row level security;
alter table fixed_expenses enable row level security;
alter table tasks enable row level security;
alter table shopping_items enable row level security;
alter table goals enable row level security;
alter table calendar_events enable row level security;
alter table settlement_records enable row level security;

CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY life_groups_select_member ON life_groups FOR SELECT USING (public.is_life_group_member(id));
CREATE POLICY life_groups_insert_owner ON life_groups FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY life_groups_update_admin ON life_groups FOR UPDATE USING (public.is_life_group_admin(id)) WITH CHECK (public.is_life_group_admin(id));
CREATE POLICY life_groups_delete_owner ON life_groups FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY group_members_select_member ON group_members FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY group_members_insert_admin ON group_members FOR INSERT WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY group_members_update_admin ON group_members FOR UPDATE USING (public.is_life_group_admin(group_id)) WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY group_members_delete_admin ON group_members FOR DELETE USING (public.is_life_group_admin(group_id));

CREATE POLICY group_invites_select_admin ON group_invites FOR SELECT USING (public.is_life_group_admin(group_id));
CREATE POLICY group_invites_insert_admin ON group_invites FOR INSERT WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY group_invites_update_admin ON group_invites FOR UPDATE USING (public.is_life_group_admin(group_id)) WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY group_invites_delete_admin ON group_invites FOR DELETE USING (public.is_life_group_admin(group_id));

CREATE POLICY categories_select_member ON categories FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY categories_insert_admin ON categories FOR INSERT WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY categories_update_admin ON categories FOR UPDATE USING (public.is_life_group_admin(group_id)) WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY categories_delete_admin ON categories FOR DELETE USING (public.is_life_group_admin(group_id));

CREATE POLICY accounts_select_member ON accounts FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY accounts_insert_admin ON accounts FOR INSERT WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY accounts_update_admin ON accounts FOR UPDATE USING (public.is_life_group_admin(group_id)) WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY accounts_delete_admin ON accounts FOR DELETE USING (public.is_life_group_admin(group_id));

CREATE POLICY budgets_select_member ON budgets FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY budgets_insert_admin ON budgets FOR INSERT WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY budgets_update_admin ON budgets FOR UPDATE USING (public.is_life_group_admin(group_id)) WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY budgets_delete_admin ON budgets FOR DELETE USING (public.is_life_group_admin(group_id));

CREATE POLICY fixed_expenses_select_member ON fixed_expenses FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY fixed_expenses_insert_admin ON fixed_expenses FOR INSERT WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY fixed_expenses_update_admin ON fixed_expenses FOR UPDATE USING (public.is_life_group_admin(group_id)) WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY fixed_expenses_delete_admin ON fixed_expenses FOR DELETE USING (public.is_life_group_admin(group_id));

CREATE POLICY transactions_select_member ON transactions FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY transactions_insert_editor ON transactions FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY transactions_update_editor ON transactions FOR UPDATE USING (public.is_life_group_editor(group_id)) WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY transactions_delete_editor ON transactions FOR DELETE USING (public.is_life_group_editor(group_id));

CREATE POLICY tasks_select_member ON tasks FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY tasks_insert_editor ON tasks FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY tasks_update_editor ON tasks FOR UPDATE USING (public.is_life_group_editor(group_id)) WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY tasks_delete_editor ON tasks FOR DELETE USING (public.is_life_group_editor(group_id));

CREATE POLICY shopping_items_select_member ON shopping_items FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY shopping_items_insert_editor ON shopping_items FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY shopping_items_update_editor ON shopping_items FOR UPDATE USING (public.is_life_group_editor(group_id)) WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY shopping_items_delete_editor ON shopping_items FOR DELETE USING (public.is_life_group_editor(group_id));

CREATE POLICY goals_select_member ON goals FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY goals_insert_editor ON goals FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY goals_update_editor ON goals FOR UPDATE USING (public.is_life_group_editor(group_id)) WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY goals_delete_editor ON goals FOR DELETE USING (public.is_life_group_editor(group_id));

CREATE POLICY calendar_events_select_member ON calendar_events FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY calendar_events_insert_editor ON calendar_events FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY calendar_events_update_editor ON calendar_events FOR UPDATE USING (public.is_life_group_editor(group_id)) WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY calendar_events_delete_editor ON calendar_events FOR DELETE USING (public.is_life_group_editor(group_id));

CREATE POLICY settlement_records_select_member ON settlement_records FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY settlement_records_insert_editor ON settlement_records FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY settlement_records_update_editor ON settlement_records FOR UPDATE USING (public.is_life_group_editor(group_id)) WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY settlement_records_delete_editor ON settlement_records FOR DELETE USING (public.is_life_group_editor(group_id));

create index idx_group_members_group_id on group_members(group_id);
create index idx_group_members_user_id on group_members(user_id);
create index idx_group_invites_code on group_invites(code);
create index idx_transactions_group_date on transactions(group_id, transaction_date desc);
create index idx_calendar_events_group_date on calendar_events(group_id, event_date);
create index idx_settlement_records_group_month on settlement_records(group_id, settlement_month);
create index idx_tasks_group_due on tasks(group_id, due_date);
create index idx_shopping_group_done on shopping_items(group_id, is_done);


-- Family Life Manager v3 업데이트 SQL
-- 기존 데이터 유지용입니다. reset 하지 말고 이 파일만 새 family Supabase 프로젝트에서 실행하세요.

alter table calendar_events add column if not exists event_type text default 'schedule';
alter table calendar_events add column if not exists is_important boolean default false;

create table if not exists anniversary_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  title text not null,
  anniversary_date date not null,
  calendar_type text default 'solar',
  repeat_type text default 'yearly',
  member_id uuid references group_members(id) on delete set null,
  memo text,
  created_at timestamp with time zone default now()
);

create table if not exists diary_entries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  author_member_id uuid references group_members(id) on delete set null,
  diary_date date not null,
  title text not null,
  mood text default 'normal',
  content text not null,
  visibility text default 'group',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table anniversary_events enable row level security;
alter table diary_entries enable row level security;

DROP POLICY IF EXISTS anniversary_events_select_member ON anniversary_events;
DROP POLICY IF EXISTS anniversary_events_insert_editor ON anniversary_events;
DROP POLICY IF EXISTS anniversary_events_update_editor ON anniversary_events;
DROP POLICY IF EXISTS anniversary_events_delete_editor ON anniversary_events;
CREATE POLICY anniversary_events_select_member ON anniversary_events FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY anniversary_events_insert_editor ON anniversary_events FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY anniversary_events_update_editor ON anniversary_events FOR UPDATE USING (public.is_life_group_editor(group_id)) WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY anniversary_events_delete_editor ON anniversary_events FOR DELETE USING (public.is_life_group_editor(group_id));

DROP POLICY IF EXISTS diary_entries_select_member ON diary_entries;
DROP POLICY IF EXISTS diary_entries_insert_editor ON diary_entries;
DROP POLICY IF EXISTS diary_entries_update_editor ON diary_entries;
DROP POLICY IF EXISTS diary_entries_delete_editor ON diary_entries;
CREATE POLICY diary_entries_select_member ON diary_entries FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY diary_entries_insert_editor ON diary_entries FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY diary_entries_update_editor ON diary_entries FOR UPDATE USING (public.is_life_group_editor(group_id)) WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY diary_entries_delete_editor ON diary_entries FOR DELETE USING (public.is_life_group_editor(group_id));

create index if not exists anniversary_events_group_date_idx on anniversary_events(group_id, anniversary_date);
create index if not exists diary_entries_group_date_idx on diary_entries(group_id, diary_date desc);
create index if not exists calendar_events_group_date_idx on calendar_events(group_id, event_date);
-- Family Life Manager v6 업데이트 SQL
-- 다이어리 사진 첨부 기능용 Storage bucket + 사진 메타데이터 테이블입니다.
-- 기존 데이터는 유지됩니다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diary-photos',
  'diary-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

create table if not exists diary_photos (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade,
  diary_entry_id uuid references diary_entries(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  file_name text,
  file_size bigint,
  sort_order int default 0,
  created_at timestamp with time zone default now()
);

alter table diary_photos enable row level security;

DROP POLICY IF EXISTS diary_photos_select_member ON diary_photos;
DROP POLICY IF EXISTS diary_photos_insert_editor ON diary_photos;
DROP POLICY IF EXISTS diary_photos_update_editor ON diary_photos;
DROP POLICY IF EXISTS diary_photos_delete_editor ON diary_photos;

CREATE POLICY diary_photos_select_member ON diary_photos
FOR SELECT USING (public.is_life_group_member(group_id));

CREATE POLICY diary_photos_insert_editor ON diary_photos
FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));

CREATE POLICY diary_photos_update_editor ON diary_photos
FOR UPDATE USING (public.is_life_group_editor(group_id))
WITH CHECK (public.is_life_group_editor(group_id));

CREATE POLICY diary_photos_delete_editor ON diary_photos
FOR DELETE USING (public.is_life_group_editor(group_id));

create index if not exists diary_photos_group_idx on diary_photos(group_id);
create index if not exists diary_photos_entry_idx on diary_photos(diary_entry_id, sort_order);

DROP POLICY IF EXISTS diary_photos_storage_select_member ON storage.objects;
DROP POLICY IF EXISTS diary_photos_storage_insert_editor ON storage.objects;
DROP POLICY IF EXISTS diary_photos_storage_update_editor ON storage.objects;
DROP POLICY IF EXISTS diary_photos_storage_delete_editor ON storage.objects;

CREATE POLICY diary_photos_storage_select_member ON storage.objects
FOR SELECT USING (
  bucket_id = 'diary-photos'
  and public.is_life_group_member(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY diary_photos_storage_insert_editor ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'diary-photos'
  and public.is_life_group_editor(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY diary_photos_storage_update_editor ON storage.objects
FOR UPDATE USING (
  bucket_id = 'diary-photos'
  and public.is_life_group_editor(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'diary-photos'
  and public.is_life_group_editor(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY diary_photos_storage_delete_editor ON storage.objects
FOR DELETE USING (
  bucket_id = 'diary-photos'
  and public.is_life_group_editor(((storage.foldername(name))[1])::uuid)
);
