-- chronic-care-mobile: 患者/管理员双端 — 初始 schema
-- 在 Supabase Dashboard → SQL Editor 中执行本脚本

create extension if not exists pgcrypto;

-- 一个家庭空间 = 一份用药数据（对应 app defaultState JSON）
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  app_state jsonb not null default '{}'::jsonb,
  admin_mode_enabled boolean not null default false,
  token_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  username text not null,
  password_hash text not null,
  role text not null check (role in ('patient', 'admin')),
  created_at timestamptz not null default now(),
  constraint users_username_unique unique (username)
);

-- 每个 household 仅允许 1 个患者账号；管理员最多 3 个由应用层校验
create unique index if not exists users_one_patient_per_household_idx
  on users (household_id)
  where role = 'patient';

create index if not exists users_household_id_idx on users (household_id);

create table if not exists invite_codes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  used_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invite_codes_household_id_idx on invite_codes (household_id);
create index if not exists invite_codes_code_idx on invite_codes (code);

create or replace function set_households_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists households_updated_at on households;
create trigger households_updated_at
  before update on households
  for each row
  execute function set_households_updated_at();
