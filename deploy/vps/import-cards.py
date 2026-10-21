#!/usr/bin/env python3
"""Normativ karta rasmlari (PNG arxivlari: Bozor, Xarajatlar, Kichik/Katta sarmoyalar, Katta aylana xarajatlari, Shit happens, Kasb kartalari)ni
`content/data/cards.json` dagi `file` nomlari bilan WebP qilib chiqaradi.

Ishlatish:  python3 deploy/vps/import-cards.py <papka> [chiqish_papka=deploy/vps/cards] [eng_katta_eni=960]
<papka> ichida arxivlar ochilgan bo'lishi kerak (z_Bozor/, z_Xarajatlar/, ... yoki istalgan chuqurlikda PNG'lar). Fayl nomi apostroflar va harf registriga qaramay solishtiriladi
(masalan 11_G'AZNACHI.png ↔ 11_GAZNACHI.webp). Har bir karta uchun rasm topilishi shart; topilmaganlari ro'yxat qilinadi (hozircha 6 ta yangi karta — dizayner kutilmoqda).
Chiqish: <chiqish_papka>/<file>.webp, kartalar orqasi: back_kasb.webp, back_hod.webp. Rasmlar repoda emas: scp -r <chiqish_papka>/* deploy@<server>:~/D-game/deploy/vps/cards/
"""
import json, os, re, sys
from PIL import Image

src = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else "deploy/vps/cards"; maxw = int(sys.argv[3]) if len(sys.argv) > 3 else 960
key = lambda n: re.sub(r"['‘’ʻ`´]", "", os.path.splitext(os.path.basename(n))[0]).lower()
files = {}
for root, _, names in os.walk(src):
    for n in names:
        if n.lower().endswith(".png"):
            k = key(n)
            if k in files: sys.exit(f"takroriy nom: {k} ({files[k]} va {os.path.join(root, n)}) — bo'limlar chalkashgan")
            files[k] = os.path.join(root, n)
cards = json.load(open(os.path.join(os.path.dirname(__file__), "../../content/data/cards.json"), encoding="utf-8"))
os.makedirs(out, exist_ok=True); missing = []; n = 0

def save(path, name):
    im = Image.open(path).convert("RGBA" if "A" in Image.open(path).getbands() else "RGB")
    if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    im.save(os.path.join(out, name), "WEBP", quality=84, method=6)

for deck, rows in cards.items():
    for c in rows:
        f = c.get("file") if isinstance(c, dict) else None
        if not f: continue
        p = files.get(key(f))
        if not p: missing.append(f"{deck}: {f}"); continue
        save(p, f); n += 1
for k, name in (("00_orqa_tomon", "back_kasb.webp"), ("orqa_tomon_umumiy", "back_hod.webp")):
    if k in files: save(files[k], name); n += 1
print(f"{n} ta fayl yozildi → {out}")
if missing: print(f"rasmi YO'Q ({len(missing)}):", *missing, sep="\n  ")
