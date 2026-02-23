-- NO-OP (corrupted migration replaced)
-- This file previously contained invalid escaping like: do \$\$
do $$ begin
  -- intentionally empty
end $$;
