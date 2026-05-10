-- Together Life v14: 정산 일부 수령/남은 금액 표시 기능
-- 기존 데이터를 유지하면서 settlement_records에 받은 금액 컬럼만 추가합니다.

alter table public.settlement_records
add column if not exists paid_amount numeric not null default 0;

update public.settlement_records
set paid_amount = amount
where status = 'completed'
  and coalesce(paid_amount, 0) = 0;

update public.settlement_records
set paid_amount = 0
where status = 'pending'
  and paid_amount is null;

notify pgrst, 'reload schema';
