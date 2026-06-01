-- v26.1 optional data cleanup
-- Purpose: align transaction type label with stored balance_delta after v26.
-- Run only if old income rows still appear as expense in the transaction list.

update public.transactions
set type = 'income',
    settlement_required = false,
    split_method = 'none'
where coalesce(balance_delta, 0) > 0
  and type <> 'income';

update public.transactions
set type = 'expense'
where coalesce(balance_delta, 0) < 0
  and type <> 'expense';

notify pgrst, 'reload schema';
