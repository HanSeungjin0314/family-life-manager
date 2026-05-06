-- Family Life Manager v2 update SQL
-- v1 DB를 유지하면서 권한/초대/일정/정산완료 기능만 추가합니다.

create extension if not exists pgcrypto;

alter table group_members alter column role set default 'member';

create table if not exists group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  code text not null unique,
  role text not null default 'member',
  memo text,
  is_active boolean not null default true,
  expires_at timestamp with time zone default (now() + interval '14 days'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default now()
);

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references life_groups(id) on delete cascade not null,
  title text not null,
  event_date date not null default current_date,
  event_time time,
  assigned_to_member_id uuid references group_members(id) on delete set null,
  repeat_type text not null default 'none',
  is_done boolean not null default false,
  memo text,
  created_at timestamp with time zone default now()
);

alter table settlement_records add column if not exists settlement_month date not null default date_trunc('month', now())::date;
alter table settlement_records add column if not exists completed_at timestamp with time zone;

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

alter table group_invites enable row level security;
alter table calendar_events enable row level security;


-- group_members 정책도 v2 권한 구조로 재설정합니다.
DROP POLICY IF EXISTS group_members_insert_owner ON group_members;
DROP POLICY IF EXISTS group_members_update_owner_or_self ON group_members;
DROP POLICY IF EXISTS group_members_delete_owner ON group_members;
DROP POLICY IF EXISTS group_members_select_member ON group_members;
DROP POLICY IF EXISTS group_members_insert_admin ON group_members;
DROP POLICY IF EXISTS group_members_update_admin ON group_members;
DROP POLICY IF EXISTS group_members_delete_admin ON group_members;
CREATE POLICY group_members_select_member ON group_members FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY group_members_insert_admin ON group_members FOR INSERT WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY group_members_update_admin ON group_members FOR UPDATE USING (public.is_life_group_admin(group_id)) WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY group_members_delete_admin ON group_members FOR DELETE USING (public.is_life_group_admin(group_id));

DROP POLICY IF EXISTS group_invites_select_admin ON group_invites;
DROP POLICY IF EXISTS group_invites_insert_admin ON group_invites;
DROP POLICY IF EXISTS group_invites_update_admin ON group_invites;
DROP POLICY IF EXISTS group_invites_delete_admin ON group_invites;
CREATE POLICY group_invites_select_admin ON group_invites FOR SELECT USING (public.is_life_group_admin(group_id));
CREATE POLICY group_invites_insert_admin ON group_invites FOR INSERT WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY group_invites_update_admin ON group_invites FOR UPDATE USING (public.is_life_group_admin(group_id)) WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY group_invites_delete_admin ON group_invites FOR DELETE USING (public.is_life_group_admin(group_id));

DROP POLICY IF EXISTS calendar_events_select_member ON calendar_events;
DROP POLICY IF EXISTS calendar_events_insert_editor ON calendar_events;
DROP POLICY IF EXISTS calendar_events_update_editor ON calendar_events;
DROP POLICY IF EXISTS calendar_events_delete_editor ON calendar_events;
CREATE POLICY calendar_events_select_member ON calendar_events FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY calendar_events_insert_editor ON calendar_events FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY calendar_events_update_editor ON calendar_events FOR UPDATE USING (public.is_life_group_editor(group_id)) WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY calendar_events_delete_editor ON calendar_events FOR DELETE USING (public.is_life_group_editor(group_id));

-- v2 권한 정책: 조회는 구성원 모두, 주요 설정은 owner/admin, 생활 입력은 owner/admin/member, viewer는 조회 전용.
DROP POLICY IF EXISTS categories_member_all ON categories;
DROP POLICY IF EXISTS accounts_member_all ON accounts;
DROP POLICY IF EXISTS budgets_member_all ON budgets;
DROP POLICY IF EXISTS fixed_expenses_member_all ON fixed_expenses;
DROP POLICY IF EXISTS transactions_member_all ON transactions;
DROP POLICY IF EXISTS tasks_member_all ON tasks;
DROP POLICY IF EXISTS shopping_items_member_all ON shopping_items;
DROP POLICY IF EXISTS goals_member_all ON goals;
DROP POLICY IF EXISTS settlement_records_member_all ON settlement_records;

DROP POLICY IF EXISTS categories_select_member ON categories;
DROP POLICY IF EXISTS categories_insert_admin ON categories;
DROP POLICY IF EXISTS categories_update_admin ON categories;
DROP POLICY IF EXISTS categories_delete_admin ON categories;
CREATE POLICY categories_select_member ON categories FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY categories_insert_admin ON categories FOR INSERT WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY categories_update_admin ON categories FOR UPDATE USING (public.is_life_group_admin(group_id)) WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY categories_delete_admin ON categories FOR DELETE USING (public.is_life_group_admin(group_id));

DROP POLICY IF EXISTS accounts_select_member ON accounts;
DROP POLICY IF EXISTS accounts_insert_admin ON accounts;
DROP POLICY IF EXISTS accounts_update_admin ON accounts;
DROP POLICY IF EXISTS accounts_delete_admin ON accounts;
CREATE POLICY accounts_select_member ON accounts FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY accounts_insert_admin ON accounts FOR INSERT WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY accounts_update_admin ON accounts FOR UPDATE USING (public.is_life_group_admin(group_id)) WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY accounts_delete_admin ON accounts FOR DELETE USING (public.is_life_group_admin(group_id));

DROP POLICY IF EXISTS budgets_select_member ON budgets;
DROP POLICY IF EXISTS budgets_insert_admin ON budgets;
DROP POLICY IF EXISTS budgets_update_admin ON budgets;
DROP POLICY IF EXISTS budgets_delete_admin ON budgets;
CREATE POLICY budgets_select_member ON budgets FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY budgets_insert_admin ON budgets FOR INSERT WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY budgets_update_admin ON budgets FOR UPDATE USING (public.is_life_group_admin(group_id)) WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY budgets_delete_admin ON budgets FOR DELETE USING (public.is_life_group_admin(group_id));

DROP POLICY IF EXISTS fixed_expenses_select_member ON fixed_expenses;
DROP POLICY IF EXISTS fixed_expenses_insert_admin ON fixed_expenses;
DROP POLICY IF EXISTS fixed_expenses_update_admin ON fixed_expenses;
DROP POLICY IF EXISTS fixed_expenses_delete_admin ON fixed_expenses;
CREATE POLICY fixed_expenses_select_member ON fixed_expenses FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY fixed_expenses_insert_admin ON fixed_expenses FOR INSERT WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY fixed_expenses_update_admin ON fixed_expenses FOR UPDATE USING (public.is_life_group_admin(group_id)) WITH CHECK (public.is_life_group_admin(group_id));
CREATE POLICY fixed_expenses_delete_admin ON fixed_expenses FOR DELETE USING (public.is_life_group_admin(group_id));

DROP POLICY IF EXISTS transactions_select_member ON transactions;
DROP POLICY IF EXISTS transactions_insert_editor ON transactions;
DROP POLICY IF EXISTS transactions_update_editor ON transactions;
DROP POLICY IF EXISTS transactions_delete_editor ON transactions;
CREATE POLICY transactions_select_member ON transactions FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY transactions_insert_editor ON transactions FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY transactions_update_editor ON transactions FOR UPDATE USING (public.is_life_group_editor(group_id)) WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY transactions_delete_editor ON transactions FOR DELETE USING (public.is_life_group_editor(group_id));

DROP POLICY IF EXISTS tasks_select_member ON tasks;
DROP POLICY IF EXISTS tasks_insert_editor ON tasks;
DROP POLICY IF EXISTS tasks_update_editor ON tasks;
DROP POLICY IF EXISTS tasks_delete_editor ON tasks;
CREATE POLICY tasks_select_member ON tasks FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY tasks_insert_editor ON tasks FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY tasks_update_editor ON tasks FOR UPDATE USING (public.is_life_group_editor(group_id)) WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY tasks_delete_editor ON tasks FOR DELETE USING (public.is_life_group_editor(group_id));

DROP POLICY IF EXISTS shopping_items_select_member ON shopping_items;
DROP POLICY IF EXISTS shopping_items_insert_editor ON shopping_items;
DROP POLICY IF EXISTS shopping_items_update_editor ON shopping_items;
DROP POLICY IF EXISTS shopping_items_delete_editor ON shopping_items;
CREATE POLICY shopping_items_select_member ON shopping_items FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY shopping_items_insert_editor ON shopping_items FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY shopping_items_update_editor ON shopping_items FOR UPDATE USING (public.is_life_group_editor(group_id)) WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY shopping_items_delete_editor ON shopping_items FOR DELETE USING (public.is_life_group_editor(group_id));

DROP POLICY IF EXISTS goals_select_member ON goals;
DROP POLICY IF EXISTS goals_insert_editor ON goals;
DROP POLICY IF EXISTS goals_update_editor ON goals;
DROP POLICY IF EXISTS goals_delete_editor ON goals;
CREATE POLICY goals_select_member ON goals FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY goals_insert_editor ON goals FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY goals_update_editor ON goals FOR UPDATE USING (public.is_life_group_editor(group_id)) WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY goals_delete_editor ON goals FOR DELETE USING (public.is_life_group_editor(group_id));

DROP POLICY IF EXISTS settlement_records_select_member ON settlement_records;
DROP POLICY IF EXISTS settlement_records_insert_editor ON settlement_records;
DROP POLICY IF EXISTS settlement_records_update_editor ON settlement_records;
DROP POLICY IF EXISTS settlement_records_delete_editor ON settlement_records;
CREATE POLICY settlement_records_select_member ON settlement_records FOR SELECT USING (public.is_life_group_member(group_id));
CREATE POLICY settlement_records_insert_editor ON settlement_records FOR INSERT WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY settlement_records_update_editor ON settlement_records FOR UPDATE USING (public.is_life_group_editor(group_id)) WITH CHECK (public.is_life_group_editor(group_id));
CREATE POLICY settlement_records_delete_editor ON settlement_records FOR DELETE USING (public.is_life_group_editor(group_id));

create index if not exists idx_group_invites_code on group_invites(code);
create index if not exists idx_calendar_events_group_date on calendar_events(group_id, event_date);
create index if not exists idx_settlement_records_group_month on settlement_records(group_id, settlement_month);
