-- CarbonIQ BD: প্রথম দিনের database schema
-- Supabase → SQL Editor-এ পুরোটা paste করে Run চাপো

create extension if not exists "pgcrypto";

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table factories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  location text,
  is_demo boolean default false,
  created_at timestamptz default now()
);

create table emission_factors (
  id uuid primary key default gen_random_uuid(),
  activity text not null,          -- electricity, natural_gas, diesel, lpg
  unit text not null,              -- kWh, m3, litre, kg
  kg_co2e_per_unit numeric not null,
  scope int not null check (scope in (1,2,3)),
  source text not null,
  license text not null,
  year int not null,
  version text not null,
  unique (activity, unit, year, version)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  factory_id uuid not null references factories(id) on delete cascade,
  file_path text not null,
  file_hash text not null,
  ocr_text text,
  ocr_engine text,
  created_at timestamptz default now(),
  unique (factory_id, file_hash)   -- একই ফাইল দুবার না
);

create table activity_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  factory_id uuid not null references factories(id) on delete cascade,
  document_id uuid references documents(id),
  activity text not null,
  quantity numeric not null check (quantity >= 0),
  unit text not null,
  period_month date not null,      -- মাসের প্রথম দিন, যেমন 2026-07-01
  account_ref text,                -- masked
  status text not null default 'draft' check (status in ('draft','confirmed','rejected')),
  confirmed_by text,
  confirmed_at timestamptz,
  created_at timestamptz default now()
);

create table emission_results (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  record_id uuid not null references activity_records(id) on delete cascade,
  factor_id uuid not null references emission_factors(id),
  scope int not null,
  kg_co2e numeric not null,
  created_at timestamptz default now()
);

create table ledger_entries (
  id bigserial primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  factory_id uuid not null references factories(id) on delete cascade,
  record_id uuid not null references activity_records(id),
  payload jsonb not null,
  prev_hash text not null,
  hash text not null unique,
  created_at timestamptz default now()
);

-- Row-level security চালু (policy পরে auth যোগ করার সময়)
alter table organizations    enable row level security;
alter table factories        enable row level security;
alter table documents        enable row level security;
alter table activity_records enable row level security;
alter table emission_results enable row level security;
alter table ledger_entries   enable row level security;
