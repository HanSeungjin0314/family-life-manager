-- Together Life v23
-- 휴지통/복구 기능용 DB 업데이트입니다. Supabase SQL Editor에서 실행하세요.
-- 주요 테이블에 deleted_at/deleted_by 컬럼을 추가합니다.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'group_members','group_invites','categories','accounts','budgets','transactions','fixed_expenses','tasks','shopping_items','goals','calendar_events','anniversary_events','diary_entries','diary_photos','settlement_records','vehicles','vehicle_maintenance_items','place_records'
  ]
  loop
    execute format('alter table public.%I add column if not exists deleted_at timestamptz', table_name);
    execute format('alter table public.%I add column if not exists deleted_by uuid', table_name);
  end loop;
end $$;

-- 조회 정책은 기존 정책을 유지합니다. 프론트에서 deleted_at is null인 항목만 일반 목록에 표시합니다.
-- 복구는 소유자 계정에서만 사용하도록 화면에서 제한합니다.

notify pgrst, 'reload schema';
