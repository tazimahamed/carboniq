create table if not exists mrv_projects (
  id text primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  factory_id uuid not null references factories(id) on delete cascade,
  name text not null,
  start_month date not null,
  activities text[] not null,
  capex_tk numeric,
  created_at timestamptz default now()
);

create table if not exists verifications (
  id bigserial primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  factory_id uuid not null references factories(id) on delete cascade,
  target_type text not null check (target_type in ('passport', 'project', 'inventory')),
  target_id text not null,
  level text not null check (level in ('factory_review', 'independent')),
  reviewer text not null,
  organization text not null,
  scope text not null,
  reference text,
  statement text,
  prev_hash text not null,
  hash text not null unique,
  created_at timestamptz default now()
);

alter table mrv_projects enable row level security;
alter table verifications enable row level security;
