-- Together Life v25
-- 고정비 즉시 반영 로직 + 신용카드 월 정산 기록용 DB 업데이트입니다.
-- Supabase SQL Editor에서 한 번 실행하세요.

create table if not exists public.credit_card_settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.life_groups(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  settlement_month date not null,
  amount numeric not null default 0,
  settled_by uuid references auth.users(id) on delete set null,
  memo text,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz not null default now(),
  unique (group_id, account_id, settlement_month)
);

alter table public.credit_card_settlements enable row level security;

drop policy if exists credit_card_settlements_select_member on public.credit_card_settlements;
drop policy if exists credit_card_settlements_insert_editor on public.credit_card_settlements;
drop policy if exists credit_card_settlements_update_editor on public.credit_card_settlements;
drop policy if exists credit_card_settlements_delete_editor on public.credit_card_settlements;

create policy credit_card_settlements_select_member
on public.credit_card_settlements
for select
using (public.is_life_group_member(group_id));

create policy credit_card_settlements_insert_editor
on public.credit_card_settlements
for insert
with check (public.is_life_group_editor(group_id));

create policy credit_card_settlements_update_editor
on public.credit_card_settlements
for update
using (public.is_life_group_editor(group_id))
with check (public.is_life_group_editor(group_id));

create policy credit_card_settlements_delete_editor
on public.credit_card_settlements
for delete
using (public.is_life_group_editor(group_id));

notify pgrst, 'reload schema';
