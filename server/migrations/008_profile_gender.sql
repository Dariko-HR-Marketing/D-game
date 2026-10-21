-- Ixtiyoriy jins ('m' | 'f'): faqat standart avatar ko'rinishini tanlash uchun; boshqa maqsadda ishlatilmaydi. Hisob o'chirilganda profil bilan birga o'chadi.
alter table profiles add column if not exists gender text check (gender in ('m','f'));
