-- Frontend calls: rpc("approve_access_request", { p_role, request_id })
-- Add overload to match that exact signature.

drop function if exists public.approve_access_request(text, uuid);

create or replace function public.approve_access_request(p_role text, request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Keep the param for compatibility (future: set default role on approval)
  -- For now, just forward to the 1-arg implementation.
  perform public.approve_access_request(request_id);
end $$;

grant execute on function public.approve_access_request(text, uuid) to authenticated;

-- Force PostgREST (Supabase API) to reload schema cache
notify pgrst, 'reload schema';
