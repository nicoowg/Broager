#!/usr/bin/env python3
"""Genererer app-ikoner til Broager Snake (PWA / apple-touch-icon)."""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)

BG_TOP = (26, 37, 71)     # #1a2547
BG_BOT = (11, 16, 32)     # #0b1020
SNAKE = (52, 227, 107)    # #34e36b
SNAKE_HEAD = (142, 255, 176)
APPLE = (255, 77, 109)    # #ff4d6d
DARK = (5, 33, 15)


def rounded(draw, box, r, fill):
    draw.rounded_rectangle(box, radius=r, fill=fill)


def make(size, maskable=False):
    S = 1024  # tegn stort og skaler ned for pæne kanter
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # baggrund (lodret gradient) i en afrundet firkant
    bg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bg)
    for y in range(S):
        t = y / S
        c = tuple(int(BG_TOP[i] + (BG_BOT[i] - BG_TOP[i]) * t) for i in range(3))
        bd.line([(0, y), (S, y)], fill=c + (255,))
    mask = Image.new("L", (S, S), 0)
    md = ImageDraw.Draw(mask)
    radius = int(S * (0.20 if not maskable else 0.0))
    md.rounded_rectangle([0, 0, S - 1, S - 1], radius=radius, fill=255)
    img.paste(bg, (0, 0), mask)
    d = ImageDraw.Draw(img)

    # ved maskable: hold motivet inde i en sikker zone
    pad = int(S * (0.20 if maskable else 0.13))
    area = S - pad * 2
    g = 6  # gitter
    cw = area / g
    inset = cw * 0.14
    cr = cw * 0.30

    def gcell(gx, gy, color, head=False):
        x0 = pad + gx * cw + inset
        y0 = pad + gy * cw + inset
        x1 = pad + (gx + 1) * cw - inset
        y1 = pad + (gy + 1) * cw - inset
        rounded(d, [x0, y0, x1, y1], int(cr), color)
        if head:
            # to øjne
            ew = cw * 0.12
            ex = (x0 + x1) / 2
            ey = (y0 + y1) / 2
            for sgn in (-1, 1):
                d.ellipse([ex + sgn * cw * 0.18 - ew, ey - cw * 0.05 - ew,
                           ex + sgn * cw * 0.18 + ew, ey - cw * 0.05 + ew], fill=DARK)

    # slange-sti (en pæn slangeform)
    body = [(0, 4), (0, 3), (1, 3), (2, 3), (2, 2), (2, 1), (3, 1), (4, 1), (4, 2), (4, 3)]
    for i, (gx, gy) in enumerate(body):
        t = i / (len(body) - 1)
        col = tuple(int(SNAKE[j] + (SNAKE_HEAD[j] - SNAKE[j]) * (t * 0.5)) for j in range(3))
        gcell(gx, gy, col + (255,), head=(i == len(body) - 1))

    # æble
    ax = pad + 4 * cw + cw / 2
    ay = pad + 4 * cw + cw / 2
    ar = cw * 0.42
    d.ellipse([ax - ar, ay - ar, ax + ar, ay + ar], fill=APPLE + (255,))
    d.ellipse([ax + ar * 0.2, ay - ar * 1.25, ax + ar * 0.9, ay - ar * 0.75],
              fill=SNAKE + (255,))

    out = img.resize((size, size), Image.LANCZOS)
    if maskable:
        flat = Image.new("RGBA", (size, size), BG_BOT + (255,))
        flat.alpha_composite(out)
        out = flat
    return out


jobs = [
    ("icon-180.png", 180, False),
    ("icon-192.png", 192, False),
    ("icon-512.png", 512, False),
    ("icon-512-maskable.png", 512, True),
    ("favicon.png", 64, False),
]
for name, size, mask in jobs:
    make(size, mask).save(os.path.join(OUT, name))
    print("skrev", name)
print("Færdig.")
