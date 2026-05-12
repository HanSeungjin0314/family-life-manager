-- Together Life v22
-- 기존 데이터 정리 SQL입니다. Supabase SQL Editor에서 실행하세요.
-- 목적: 과거 버전에서 섞인 type/scope 값을 현재 기준으로 정규화합니다.

-- 1) 거래 type 정규화: 수입 카테고리는 income, 그 외 transfer/이체/지출 계열은 expense로 통합
update public.transactions t
set type = 'income',
    settlement_required = false,
    split_method = 'none'
from public.categories c
where t.category_id = c.id
  and c.type = 'income';

update public.transactions
set type = 'expense'
where lower(coalesce(type::text, '')) in ('expense', 'transfer', '지출', '이체')
   or type is null;

-- 2) 거래 scope 정규화: 빈 값은 공동, 한글/영문 혼재값 정리
update public.transactions
set scope = 'shared'
where scope is null
   or lower(coalesce(scope::text, '')) in ('shared', 'joint', 'common', '공동', '');

update public.transactions
set scope = 'personal'
where lower(coalesce(scope::text, '')) in ('personal', 'private', '개인');

-- 3) 수입 거래는 정산 대상에서 제외
update public.transactions
set settlement_required = false,
    split_method = 'none'
where type = 'income';

-- 4) 고정비 scope 정규화
update public.fixed_expenses
set scope = 'shared'
where scope is null
   or lower(coalesce(scope::text, '')) in ('shared', 'joint', 'common', '공동', '');

update public.fixed_expenses
set scope = 'personal'
where lower(coalesce(scope::text, '')) in ('personal', 'private', '개인');

-- 5) 고정비 반복값 정리
update public.fixed_expenses
set repeat_enabled = false,
    repeat_type = 'none',
    repeat_until = null
where coalesce(repeat_enabled, false) = false;

update public.fixed_expenses
set repeat_type = 'monthly'
where repeat_enabled = true
  and (repeat_type is null or repeat_type = '' or repeat_type not in ('daily', 'weekly', 'monthly', 'yearly'));

-- 6) role 정리: 부부용 권한은 owner/partner만 사용
update public.group_members
set role = 'partner'
where role in ('admin', 'member', 'viewer') or role is null;

-- 7) PostgREST schema cache 갱신
notify pgrst, 'reload schema';
