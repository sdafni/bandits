create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed', 'duplicate')),
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_stripe_webhook_events_event_type on public.stripe_webhook_events(event_type);
create index if not exists idx_stripe_webhook_events_status on public.stripe_webhook_events(status);

drop trigger if exists set_stripe_webhook_events_updated_at on public.stripe_webhook_events;
create trigger set_stripe_webhook_events_updated_at
before update on public.stripe_webhook_events
for each row
execute function public.set_updated_at();

alter table public.stripe_webhook_events enable row level security;

-- Webhook events are written only by the service role from the API route.
