-- Migration 020: Franchise content per region
-- Each row stores the history text and image array for one academy region.

create table if not exists franchise_content (
  id           uuid primary key default gen_random_uuid(),
  region_value text unique not null references academy_regions(value) on delete cascade,
  history      text not null default '',
  images       text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-update updated_at on row change
create or replace function update_franchise_content_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger franchise_content_updated_at
  before update on franchise_content
  for each row execute function update_franchise_content_updated_at();

-- RLS
alter table franchise_content enable row level security;

-- Public can read all franchise content
create policy "Public can view franchise content"
  on franchise_content for select
  using (true);

-- Only admins can write
create policy "Admins can manage franchise content"
  on franchise_content for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );
