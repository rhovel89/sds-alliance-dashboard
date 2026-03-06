create extension if not exists pgcrypto;

alter table public.ops_threads
  add column if not exists pinned boolean not null default false;

alter table public.ops_threads
  add column if not exists last_post_at timestamptz;

create index if not exists idx_ops_threads_state_pinned_updated
  on public.ops_threads (state_code, pinned, updated_at desc);

create or replace function public.tg_ops_thread_posts_bump_thread()
returns trigger
language plpgsql
as $$
begin
  update public.ops_threads
     set updated_at = now(),
         last_post_at = now()
   where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists trg_ops_posts_bump_thread on public.ops_thread_posts;
create trigger trg_ops_posts_bump_thread
after insert on public.ops_thread_posts
for each row execute function public.tg_ops_thread_posts_bump_thread();
