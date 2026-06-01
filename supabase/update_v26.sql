-- v26: 거래별 계좌 반영 금액(balance_delta) 저장
-- 목적: 거래 삭제 시 수입/지출 타입 오판으로 잔액이 무조건 증가하는 문제를 방지합니다.

alter table public.transactions
add column if not exists balance_delta numeric;

-- 카테고리가 연결된 기존 거래 보정
update public.transactions t
set balance_delta = case
  when lower(coalesce(t.type, '')) like '%income%'
    or coalesce(t.type, '') like '%수입%'
    or lower(coalesce(c.type, '')) like '%income%'
    or coalesce(c.type, '') like '%수입%'
  then abs(coalesce(t.amount, 0))
  else -abs(coalesce(t.amount, 0))
end
from public.categories c
where t.category_id = c.id
  and t.balance_delta is null;

-- 카테고리가 없거나 위에서 보정되지 않은 기존 거래 보정
update public.transactions t
set balance_delta = case
  when lower(coalesce(t.type, '')) like '%income%'
    or coalesce(t.type, '') like '%수입%'
  then abs(coalesce(t.amount, 0))
  else -abs(coalesce(t.amount, 0))
end
where t.balance_delta is null;

notify pgrst, 'reload schema';
