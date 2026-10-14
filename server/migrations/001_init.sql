-- POYGA: o'yin jurnali va holat snapshotlari (SPEC §6.6, §11)
create table if not exists rooms (
  code text primary key,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create table if not exists snapshots (
  room_code text primary key references rooms(code) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists journal (
  room_code text not null references rooms(code) on delete cascade,
  seq integer not null,
  at timestamptz not null,
  entry jsonb not null,
  primary key (room_code, seq)  -- takroriy yozuvni bazaning o'zi rad etadi
);
