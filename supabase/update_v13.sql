-- Together Life v13
-- 고정비를 공동/개인으로 구분하기 위한 컬럼 추가 SQL입니다.
-- Supabase SQL Editor에서 한 번 실행하세요.

alter table public.fixed_expenses
add column if not exists scope text not null default 'shared';

alter table public.fixed_expenses
drop constraint if exists fixed_expenses_scope_check;

alter table public.fixed_expenses
add constraint fixed_expenses_scope_check check (scope in ('shared', 'personal'));

update public.fixed_expenses
set scope = 'shared'
where scope is null;

notify pgrst, 'reload schema';
