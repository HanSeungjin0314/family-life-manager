-- Together Life v24
-- UI 구조 정리 + 차량관리 보완 + 장소 기록 보완용 DB 확장

alter table public.vehicles
add column if not exists insurance_due_date date,
add column if not exists inspection_due_date date,
add column if not exists tax_due_date date;

alter table public.place_records
add column if not exists price_range text,
add column if not exists parking_available boolean not null default false,
add column if not exists revisit_intent text,
add column if not exists tags text;

notify pgrst, 'reload schema';
