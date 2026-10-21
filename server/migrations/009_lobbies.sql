-- Zal (boshlanmagan xona): server qayta ishga tushsa ham a'zolar, o'rinlar soni va sozlamalar saqlanadi. O'yin boshlangach yozuv o'chadi (snapshots ishlaydi).
create table if not exists lobbies (
  room_code text primary key,
  meta jsonb not null,
  updated_at timestamptz not null default now()
);
