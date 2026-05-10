-- Together Life v9 고정비 반복 설정 업데이트
-- 기존 데이터를 유지하면서 고정비 반복 여부와 반복 종료일 컬럼만 추가합니다.

alter table if exists fixed_expenses
  add column if not exists repeat_enabled boolean not null default true;

alter table if exists fixed_expenses
  add column if not exists repeat_until date;

-- 기존 repeat_type이 비어 있는 경우 기본값을 monthly로 맞춥니다.
update fixed_expenses
set repeat_type = 'monthly'
where repeat_type is null or repeat_type = '';

-- 기존 데이터는 현재 동작을 유지하기 위해 반복 사용으로 처리합니다.
update fixed_expenses
set repeat_enabled = true
where repeat_enabled is null;
