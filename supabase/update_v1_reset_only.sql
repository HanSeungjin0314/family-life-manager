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

DROP FUNCTION IF EXISTS public.is_life_group_owner(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_life_group_member(uuid) CASCADE;

-- Supabase SQL Editor에서 이 파일 전체를 그대로 실행하세요.
-- 주의: README 제목이나 'Family Life Manager v1' 문구를 같이 붙여넣지 마세요.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamp with time zone default now()
);

create table if not exists life_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  group_type text not null default 'family', -- couple / married / family / roommates
  memo text,
  created_at timestamp with time zone default now()
);

create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  role text not null default 'member', -- owner / admin / member
  member_type text not null default 'real', -- real / display_only
  created_at timestamp with time zone default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  name text not null,
  type text not null default 'expense', -- income / expense / task / shopping
  color text default '#4f46e5',
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  name text not null,
  account_type text not null default 'bank', -- bank / cash / credit_card / debit_card / saving
  owner_member_id uuid references group_members(id) on delete set null,
  balance numeric not null default 0,
  memo text,
  created_at timestamp with time zone default now()
);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  budget_month date not null,
  name text not null,
  category_id uuid references categories(id) on delete set null,
  limit_amount numeric not null default 0,
  scope text not null default 'shared', -- shared / personal
  created_at timestamp with time zone default now()
);

create table if not exists transactions (
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

create table if not exists fixed_expenses (
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

create table if not exists tasks (
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

create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  item_name text not null,
  quantity text,
  added_by_member_id uuid references group_members(id) on delete set null,
  is_done boolean not null default false,
  memo text,
  created_at timestamp with time zone default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  title text not null,
  target_amount numeric not null default 0,
  current_amount numeric not null default 0,
  target_date date,
  memo text,
  created_at timestamp with time zone default now()
);

create table if not exists settlement_records (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  from_member_id uuid references group_members(id) on delete cascade,
  to_member_id uuid references group_members(id) on delete cascade,
  amount numeric not null default 0,
  status text not null default 'pending', -- pending / completed
  memo text,
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
    select 1
    from life_groups g
    where g.id = target_group_id
      and g.owner_id = auth.uid()
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
    select 1
    from life_groups g
    where g.id = target_group_id
      and g.owner_id = auth.uid()
  )
  or exists (
    select 1
    from group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
  );
$$;

alter table profiles enable row level security;
alter table life_groups enable row level security;
alter table group_members enable row level security;
alter table categories enable row level security;
alter table accounts enable row level security;
alter table budgets enable row level security;
alter table transactions enable row level security;
alter table fixed_expenses enable row level security;
alter table tasks enable row level security;
alter table shopping_items enable row level security;
alter table goals enable row level security;
alter table settlement_records enable row level security;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "life_groups_select_member" ON life_groups;
DROP POLICY IF EXISTS "life_groups_insert_owner" ON life_groups;
DROP POLICY IF EXISTS "life_groups_update_owner" ON life_groups;
DROP POLICY IF EXISTS "life_groups_delete_owner" ON life_groups;
CREATE POLICY "life_groups_select_member" ON life_groups FOR SELECT USING (owner_id = auth.uid() OR public.is_life_group_member(id));
CREATE POLICY "life_groups_insert_owner" ON life_groups FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "life_groups_update_owner" ON life_groups FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "life_groups_delete_owner" ON life_groups FOR DELETE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "group_members_select_member" ON group_members;
DROP POLICY IF EXISTS "group_members_insert_owner" ON group_members;
DROP POLICY IF EXISTS "group_members_update_owner_or_self" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_owner" ON group_members;
CREATE POLICY "group_members_select_member" ON group_members FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY "group_members_insert_owner" ON group_members FOR INSERT WITH CHECK (public.is_life_group_owner(group_id));
CREATE POLICY "group_members_update_owner_or_self" ON group_members FOR UPDATE USING (public.is_life_group_owner(group_id) OR user_id = auth.uid()) WITH CHECK (public.is_life_group_owner(group_id) OR user_id = auth.uid());
CREATE POLICY "group_members_delete_owner" ON group_members FOR DELETE USING (public.is_life_group_owner(group_id));

-- 그룹 구성원이면 CRUD 가능. v1은 가족/커플 공동 관리 목적이라 권한을 단순화했습니다.
DROP POLICY IF EXISTS "categories_member_all" ON categories;
CREATE POLICY "categories_member_all" ON categories FOR ALL USING (public.is_life_group_member(group_id)) WITH CHECK (public.is_life_group_member(group_id));

DROP POLICY IF EXISTS "accounts_member_all" ON accounts;
CREATE POLICY "accounts_member_all" ON accounts FOR ALL USING (public.is_life_group_member(group_id)) WITH CHECK (public.is_life_group_member(group_id));

DROP POLICY IF EXISTS "budgets_member_all" ON budgets;
CREATE POLICY "budgets_member_all" ON budgets FOR ALL USING (public.is_life_group_member(group_id)) WITH CHECK (public.is_life_group_member(group_id));

DROP POLICY IF EXISTS "transactions_member_all" ON transactions;
CREATE POLICY "transactions_member_all" ON transactions FOR ALL USING (public.is_life_group_member(group_id)) WITH CHECK (public.is_life_group_member(group_id));

DROP POLICY IF EXISTS "fixed_expenses_member_all" ON fixed_expenses;
CREATE POLICY "fixed_expenses_member_all" ON fixed_expenses FOR ALL USING (public.is_life_group_member(group_id)) WITH CHECK (public.is_life_group_member(group_id));

DROP POLICY IF EXISTS "tasks_member_all" ON tasks;
CREATE POLICY "tasks_member_all" ON tasks FOR ALL USING (public.is_life_group_member(group_id)) WITH CHECK (public.is_life_group_member(group_id));

DROP POLICY IF EXISTS "shopping_items_member_all" ON shopping_items;
CREATE POLICY "shopping_items_member_all" ON shopping_items FOR ALL USING (public.is_life_group_member(group_id)) WITH CHECK (public.is_life_group_member(group_id));

DROP POLICY IF EXISTS "goals_member_all" ON goals;
CREATE POLICY "goals_member_all" ON goals FOR ALL USING (public.is_life_group_member(group_id)) WITH CHECK (public.is_life_group_member(group_id));

DROP POLICY IF EXISTS "settlement_records_member_all" ON settlement_records;
CREATE POLICY "settlement_records_member_all" ON settlement_records FOR ALL USING (public.is_life_group_member(group_id)) WITH CHECK (public.is_life_group_member(group_id));

create index if not exists idx_group_members_group_id on group_members(group_id);
create index if not exists idx_group_members_user_id on group_members(user_id);
create index if not exists idx_transactions_group_date on transactions(group_id, transaction_date desc);
create index if not exists idx_tasks_group_due on tasks(group_id, due_date);
create index if not exists idx_shopping_group_done on shopping_items(group_id, is_done);
