alter table snapshots add column if not exists meta jsonb;  -- a'zolar, egasi, kontent versiyasi (qayta tiklash uchun)

create table if not exists content_versions (
  version integer primary key,
  part text not null,
  note text not null default '',
  author text not null,
  at timestamptz not null,
  published boolean not null default false,
  bundle jsonb not null
);
create table if not exists settings (key text primary key, value jsonb not null);

create table if not exists app_users (
  id text primary key,
  first_seen timestamptz not null,
  last_seen timestamptz not null,
  banned boolean not null default false,
  ban_reason text
);
create table if not exists complaints (
  id serial primary key,
  from_user text not null,
  against text,
  room text,
  text text not null,
  at timestamptz not null,
  status text not null default 'open',
  resolution text,
  resolved_by text
);
create table if not exists audit_log (
  id bigserial primary key,
  at timestamptz not null,
  admin text not null,
  role text not null,
  action text not null,
  target text,
  detail jsonb
);
