#!/usr/bin/env python3
"""Ilova belgilari (Expo standart «A» o'rniga): taxta halqasi (kataklar o'yinchi ranglarida) va markazda «T» — src/ui/Logo.tsx bilan bir xil.
Ishga tushirish: `python3 client/scripts/make-icons.py` (Pillow kerak). Natija: client/assets/*.png"""
import math, os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
BG = (11, 38, 32, 255)            # #0B2620 (night.brand)
NAVY = (8, 34, 56, 255)           # #082238
WHITE = (255, 255, 255, 255)
COLORS = ["#11835A", "#F2B233", "#9E2A30", "#2C6DB5", "#7B4FA3", "#E07A2F", "#0E8FA0", "#C44E8A"]
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SS = 4  # supersampling: silliq chekkalar

def hexrgb(h): h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)

def mark(size, scale=1.0, mono=False, bg=None):
    """Belgi `size`×`size` kanvasda; `scale` — belgi ulushi (adaptive uchun xavfsiz zona)."""
    S = size * SS; im = Image.new("RGBA", (S, S), bg or (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    box = S * scale; ox = (S - box) / 2; n = 16; r = box * 0.38; dot = box * 0.13; cx = cy = S / 2
    for i in range(n):
        a = (i / n) * 2 * math.pi - math.pi / 2; x = cx + r * math.cos(a); y = cy + r * math.sin(a)
        d.rounded_rectangle([x - dot / 2, y - dot / 2, x + dot / 2, y + dot / 2], radius=dot * 0.3, fill=WHITE if mono else hexrgb(COLORS[i % len(COLORS)]))
    c = box * 0.24; d.ellipse([cx - c, cy - c, cx + c, cy + c], fill=WHITE if mono else NAVY)
    f = ImageFont.truetype(FONT, int(box * 0.30)); d.text((cx, cy), "T", font=f, fill=BG if mono else WHITE, anchor="mm")
    return im.resize((size, size), Image.LANCZOS)

def save(im, name): im.save(os.path.join(OUT, name)); print("yozildi", name, im.size)

save(mark(1024, 0.86, bg=BG), "icon.png")                          # iOS/umumiy: to'liq fon
save(mark(1024, 0.60), "android-icon-foreground.png")              # adaptive: xavfsiz zona ~66 %
save(Image.new("RGBA", (1024, 1024), BG), "android-icon-background.png")
save(mark(1024, 0.60, mono=True), "android-icon-monochrome.png")
save(mark(1024, 0.80), "splash-icon.png")
save(mark(48, 0.92, bg=BG), "favicon.png")
