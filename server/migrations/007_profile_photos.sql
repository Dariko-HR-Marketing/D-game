-- Foydalanuvchi rasmi (avatar): 256 px gacha JPEG, ko'pi bilan 80 KB. Hisob o'chirilganda profil bilan birga o'chadi.
create table if not exists profile_photos (
  user_id text primary key,
  jpeg bytea not null,
  updated_at timestamptz not null default now()
);
