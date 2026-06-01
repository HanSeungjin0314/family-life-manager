-- v25.2 optional data fix
-- 기존에 수입 카테고리로 입력했는데 transactions.type이 expense로 남아 있는 거래를 수입으로 보정합니다.
-- 새 테이블/컬럼 추가는 없으므로 필수 실행은 아닙니다.

update public.transactions t
set type = 'income',
    settlement_required = false,
    split_method = 'none'
from public.categories c
where t.category_id = c.id
  and c.type = 'income'
  and t.type <> 'income';

notify pgrst, 'reload schema';
