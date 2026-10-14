create table if not exists profiles (
  user_id text primary key,
  name text not null,
  color integer not null check (color between 0 and 5),
  birth_year integer not null,
  updated_at timestamptz not null default now()
);
create table if not exists game_results (
  id bigserial primary key,
  room_code text not null,
  finished_at timestamptz not null,
  duration_ms bigint not null,
  rounds integer not null,
  winner text,
  content_version integer,
  players jsonb not null   -- [{id, bot, circle, restarts, won}]
);
create index if not exists game_results_players on game_results using gin (players);
