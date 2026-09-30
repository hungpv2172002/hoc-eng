-- Shared server-only state for the small 1v1 lobby. Clients never read this table.
create table if not exists public.duel_state_store (
  id integer primary key check (id = 1),
  version bigint not null default 0,
  state jsonb not null default '{"sessions":{},"rooms":{},"invites":{}}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.duel_state_store enable row level security;
revoke all on public.duel_state_store from public, anon, authenticated;
grant select, insert, update on public.duel_state_store to service_role;
insert into public.duel_state_store(id) values (1) on conflict do nothing;

-- SECURITY INVOKER: only the trusted API's service_role may execute the CAS.
create or replace function public.duel_compare_and_swap(expected_version bigint, next_state jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare changed integer;
begin
  if jsonb_typeof(next_state -> 'sessions') is distinct from 'object'
    or jsonb_typeof(next_state -> 'rooms') is distinct from 'object'
    or jsonb_typeof(next_state -> 'invites') is distinct from 'object' then
    raise exception 'Invalid duel state';
  end if;
  update public.duel_state_store set state=next_state, version=version+1, updated_at=now()
    where id=1 and version=expected_version;
  get diagnostics changed = row_count;
  return changed=1;
end;
$$;
revoke all on function public.duel_compare_and_swap(bigint,jsonb) from public, anon, authenticated;
grant execute on function public.duel_compare_and_swap(bigint,jsonb) to service_role;
