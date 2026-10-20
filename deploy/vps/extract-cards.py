#!/usr/bin/env python3
"""«Kartalar kutubxonasi» maket paketidan (Tajriba24 — o'yin maketlari_4.html) karta rasmlarini `content/data/cards.json` dagi `file` nomlari bilan chiqaradi.

Ishlatish:  python3 deploy/vps/extract-cards.py <maket_4.html> [chiqish_papka=deploy/vps/cards]
Paket faqat o'qiladi (ichidagi skript ishga tushirilmaydi). Moslash: kutubxonadagi bo'limlar tartibi va soni cards.json dekalari bilan bir xil (28, 82, 85, 98, 85, 25, 9);
har bir bo'lim ichida rasmlar cards.json tartibida. Tekshiruv: kichik sarmoya rasmi nomi (KB_014), xarajat raqami (№9) fayl bilan mos kelishi shart; mos kelmasa — xato bilan to'xtaydi.
Chiqish: papkaga <file>.webp fayllari (rasmi bo'lmagan karta ro'yxati chop etiladi). Keyin: scp -r <papka>/* deploy@<server>:~/D-game/deploy/vps/cards/
"""
import base64, gzip, html, json, os, re, sys

DECKS = {"kasb": "kasb", "kichik": "kichik", "katta": "katta", "bozor": "bozor", "xarajat": "xar", "kxarajat": "kxar", "hodisa": "hod"}


def load(path):
    s = open(path, encoding="utf-8", errors="replace").read()
    man = json.loads(re.search(r'<script type="__bundler/manifest">(.*?)</script>', s, re.S).group(1))
    tpl = json.loads(re.search(r'<script type="__bundler/template">(.*?)</script>', s, re.S).group(1))
    def blob(u):
        v = man[u]; b = base64.b64decode(v["data"])
        return gzip.decompress(b) if v.get("compressed") else b
    return tpl, blob


def figures(section):
    out = []
    for m in re.finditer(r"<figure.*?</figure>", section, re.S):
        b = m.group(0); i = re.search(r'<img src="([0-9a-f-]{36})"(?: alt="([^"]*)")?', b)
        out.append((i.group(1) if i else None, html.unescape(i.group(2) or "") if i else ""))
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "cards")
    root = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
    cards = json.load(open(os.path.join(root, "content", "data", "cards.json"), encoding="utf-8"))
    tpl, blob = load(src); os.makedirs(out, exist_ok=True)
    written, missing = 0, []
    for sec in re.split(r'<h2 id="h-', tpl)[1:]:
        key = sec.split('"')[0]
        if key not in DECKS:
            continue
        deck = cards[DECKS[key]]; deck = deck if isinstance(deck, list) else list(deck.values()); figs = figures(sec)
        if len(figs) != len(deck):
            sys.exit(f"Bo'lim «{key}»: kutubxonada {len(figs)} ta, cards.json'da {len(deck)} ta — moslab bo'lmaydi")
        for (u, alt), c in zip(figs, deck):
            if key == "kichik" and alt.replace("_", "").lower() != c["file"].rsplit(".", 1)[0].replace("_", "").lower():
                sys.exit(f"Tartib mos emas: {alt} ≠ {c['file']}")
            if key in ("xarajat", "kxarajat") and re.sub(r"\D", "", alt) != str(int(c["n"])):
                sys.exit(f"Tartib mos emas: {alt} ≠ {c['file']}")
            if not u:
                missing.append(c["file"]); continue
            open(os.path.join(out, c["file"]), "wb").write(blob(u)); written += 1
    print(f"{written} ta rasm yozildi: {out}")
    if missing:
        print("Rasmi yo'q (kutubxonada bo'sh joy):", ", ".join(missing))


main()
