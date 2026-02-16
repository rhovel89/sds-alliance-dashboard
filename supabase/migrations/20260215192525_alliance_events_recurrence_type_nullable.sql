-- Fix: recurrence_type must be optional for one-time events
alter table public.alliance_events
  alter column recurrence_type drop not null;
