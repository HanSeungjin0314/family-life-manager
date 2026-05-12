-- Together Life v20.2
-- 수입 카테고리로 저장했는데 거래 type이 expense로 남아 있는 기존 데이터 보정용입니다.
-- 새 DB 컬럼 추가는 없습니다. 필요할 때만 실행하세요.

update public.transactions t
set type = 'income',
    settlement_required = false,
    split_method = 'none'
from public.categories c
where t.category_id = c.id
  and c.type = 'income'
  and t.type <> 'income';

notify pgrst, 'reload schema';
