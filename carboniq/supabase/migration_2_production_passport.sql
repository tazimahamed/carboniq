-- CarbonIQ: উৎপাদন আর Carbon Passport-এর table
-- Supabase → SQL Editor-এ পুরোটা paste করে Run চাপো (একবারই)

create table if not exists production (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  factory_id uuid not null references factories(id) on delete cascade,
  period_month date not null,           -- মাসের প্রথম দিন
  buyer text not null,                  -- কোন buyer-এর order
  pieces integer not null check (pieces >= 0),
  created_at timestamptz default now(),
  unique (factory_id, period_month, buyer)
);

create table if not exists passports (
  id text primary key,                  -- ছোট public id (QR-এ যায়)
  org_id uuid not null references organizations(id) on delete cascade,
  factory_id uuid not null references factories(id) on delete cascade,
  buyer text not null,
  order_ref text not null,
  pieces integer not null check (pieces > 0),
  period_from date not null,
  period_to date not null,
  payload jsonb not null,               -- passport-এ যা দেখায়, হুবহু
  ledger_hash text not null,            -- তৈরির সময় ledger-এর শেষ hash
  hash text not null unique,            -- sha256(payload + ledger_hash)
  revoked boolean not null default false,
  created_at timestamptz default now()
);

alter table production enable row level security;
alter table passports  enable row level security;
