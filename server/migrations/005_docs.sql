-- Tijorat, ta'lim va turnir ma'lumotlari: bitta umumiy hujjatlar jadvali (har bir tur — o'z `kind` i).
create table if not exists docs (
  kind text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);
create index if not exists docs_kind_idx on docs (kind);
