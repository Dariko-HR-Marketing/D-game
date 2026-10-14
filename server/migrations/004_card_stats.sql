create table if not exists card_stats (
  card_id text primary key,
  shown integer not null default 0,
  accepted integer not null default 0,
  skipped integer not null default 0
);
