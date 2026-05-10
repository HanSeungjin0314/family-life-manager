-- Together Life v15 업데이트 SQL
-- 일정 반복 종료일 기능을 위한 컬럼 추가입니다.

alter table public.calendar_events
add column if not exists repeat_until date;

notify pgrst, 'reload schema';
