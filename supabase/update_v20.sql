-- Together Life v20
-- 부부용 권한 단순화 + 개인 지출/개인 고정비 작성자 본인만 조회하도록 변경합니다.
-- Supabase SQL Editor에서 한 번 실행하세요.

-- 1) 기존 역할을 소유자/파트너 구조로 정리합니다.
update public.group_members
set role = 'partner'
where role in ('admin', 'member', 'viewer');

update public.group_invites
set role = 'partner'
where role in ('admin', 'member', 'viewer');

-- 2) 개인 고정비도 작성자를 저장할 수 있게 합니다.
alter table public.fixed_expenses
add column if not exists created_by uuid references auth.users(id) on delete set null;

-- 기존 개인 고정비 중 결제자 실계정이 있으면 작성자를 보정합니다.
update public.fixed_expenses fe
set created_by = gm.user_id
from public.group_members gm
where fe.paid_by_member_id = gm.id
  and fe.scope = 'personal'
  and fe.created_by is null
  and gm.user_id is not null;

-- 기존 개인 거래 중 결제자 실계정이 있는데 created_by가 비어 있으면 작성자를 보정합니다.
update public.transactions t
set created_by = gm.user_id
from public.group_members gm
where t.paid_by_member_id = gm.id
  and t.scope = 'personal'
  and t.created_by is null
  and gm.user_id is not null;

-- 3) 권한 함수 재정의
create or replace function public.is_life_group_admin(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.life_groups g
    where g.id = target_group_id
      and g.owner_id = auth.uid()
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
    select 1
    from public.life_groups g
    where g.id = target_group_id
      and g.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.role in ('partner', 'owner', 'admin', 'member')
  );
$$;

create or replace function public.is_own_group_member(target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.id = target_member_id
      and gm.user_id = auth.uid()
  );
$$;

-- 4) 거래 RLS: 공동 거래는 그룹 구성원 모두, 개인 거래는 작성자 본인만
drop policy if exists transactions_select_member on public.transactions;
drop policy if exists transactions_insert_editor on public.transactions;
drop policy if exists transactions_update_editor on public.transactions;
drop policy if exists transactions_delete_editor on public.transactions;
drop policy if exists transactions_select_partner_privacy on public.transactions;
drop policy if exists transactions_insert_partner_privacy on public.transactions;
drop policy if exists transactions_update_partner_privacy on public.transactions;
drop policy if exists transactions_delete_partner_privacy on public.transactions;

create policy transactions_select_partner_privacy
on public.transactions
for select
using (
  public.is_life_group_member(group_id)
  and (
    coalesce(scope, 'shared') <> 'personal'
    or created_by = auth.uid()
    or public.is_own_group_member(paid_by_member_id)
  )
);

create policy transactions_insert_partner_privacy
on public.transactions
for insert
with check (
  public.is_life_group_editor(group_id)
  and (
    coalesce(scope, 'shared') <> 'personal'
    or created_by = auth.uid()
  )
);

create policy transactions_update_partner_privacy
on public.transactions
for update
using (
  public.is_life_group_editor(group_id)
  and (
    coalesce(scope, 'shared') <> 'personal'
    or created_by = auth.uid()
    or public.is_own_group_member(paid_by_member_id)
  )
)
with check (
  public.is_life_group_editor(group_id)
  and (
    coalesce(scope, 'shared') <> 'personal'
    or created_by = auth.uid()
  )
);

create policy transactions_delete_partner_privacy
on public.transactions
for delete
using (
  public.is_life_group_editor(group_id)
  and (
    coalesce(scope, 'shared') <> 'personal'
    or created_by = auth.uid()
    or public.is_own_group_member(paid_by_member_id)
  )
);

-- 5) 고정비 RLS: 공동 고정비는 그룹 구성원 모두, 개인 고정비는 작성자 본인만
drop policy if exists fixed_expenses_select_member on public.fixed_expenses;
drop policy if exists fixed_expenses_insert_admin on public.fixed_expenses;
drop policy if exists fixed_expenses_update_admin on public.fixed_expenses;
drop policy if exists fixed_expenses_delete_admin on public.fixed_expenses;
drop policy if exists fixed_expenses_select_partner_privacy on public.fixed_expenses;
drop policy if exists fixed_expenses_insert_partner_privacy on public.fixed_expenses;
drop policy if exists fixed_expenses_update_partner_privacy on public.fixed_expenses;
drop policy if exists fixed_expenses_delete_partner_privacy on public.fixed_expenses;

create policy fixed_expenses_select_partner_privacy
on public.fixed_expenses
for select
using (
  public.is_life_group_member(group_id)
  and (
    coalesce(scope, 'shared') <> 'personal'
    or created_by = auth.uid()
    or public.is_own_group_member(paid_by_member_id)
  )
);

create policy fixed_expenses_insert_partner_privacy
on public.fixed_expenses
for insert
with check (
  public.is_life_group_editor(group_id)
  and (
    coalesce(scope, 'shared') <> 'personal'
    or created_by = auth.uid()
  )
);

create policy fixed_expenses_update_partner_privacy
on public.fixed_expenses
for update
using (
  public.is_life_group_editor(group_id)
  and (
    coalesce(scope, 'shared') <> 'personal'
    or created_by = auth.uid()
    or public.is_own_group_member(paid_by_member_id)
  )
)
with check (
  public.is_life_group_editor(group_id)
  and (
    coalesce(scope, 'shared') <> 'personal'
    or created_by = auth.uid()
  )
);

create policy fixed_expenses_delete_partner_privacy
on public.fixed_expenses
for delete
using (
  public.is_life_group_editor(group_id)
  and (
    coalesce(scope, 'shared') <> 'personal'
    or created_by = auth.uid()
    or public.is_own_group_member(paid_by_member_id)
  )
);

notify pgrst, 'reload schema';
