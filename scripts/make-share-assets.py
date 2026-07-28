#!/usr/bin/env python3
"""Generate favicon + classy OG share collage from product PNGs."""

from __future__ import annotations

import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
PRODUCTS = PUBLIC / "products"
FONTS = Path(__file__).resolve().parent / "fonts"

PINE = (28, 50, 39)
PINE_DEEP = (18, 36, 28)
PINE_MID = (45, 72, 56)
BRASS = (207, 169, 94)
BRASS_LIGHT = (232, 205, 148)
LINEN = (246, 242, 234)

# Curated bottles that read well small — variety of silhouettes
PICKS = [
    "fresh/fresh-cleanser.png",
    "fresh/fresh-cleansing-water.png",
    "fresh/fresh-hydro-serum.png",
    "fresh/fresh-anti-wrinkle-serum.png",
    "fresh/fresh-cream-medium.png",
    "fresh/fresh-cream-rich.png",
    "fresh/fresh-adds-glow.png",
    "fresh/fresh-adds-repair.png",
    "fresh/fresh-eye-serum.png",
    "fresh/fresh-toner-calm.png",
    "fresh/fresh-toner-pure.png",
    "fresh/fresh-deodorant.png",
    "fresh/fresh-body-milk-light.png",
    "fresh/fresh-hand-balm.png",
    "fresh/fresh-enzyme-mask.png",
    "fresh/fresh-after-sun.png",
    "fresh/fresh-shampoo-repair.png",
    "caps/caps-immu.png",
    "caps/caps-cerebro.png",
    "caps/caps-beauty-hair.png",
    "caps/caps-moodoo.png",
    "packs/packs-abc.png",
    "packs/pack-antiox.png",
    "beyond/beyond-omega.png",
]


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = FONTS / name
    return ImageFont.truetype(str(path), size=size)


def rounded_rect(draw: ImageDraw.ImageDraw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def prepare_product(path: Path, target_h: int) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    # Trim near-transparent margins so bottles sit tighter
    alpha = im.split()[-1]
    bbox = alpha.getbbox()
    if bbox:
        im = im.crop(bbox)
    w, h = im.size
    scale = target_h / h
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    return im.resize((nw, nh), Image.Resampling.LANCZOS)


def make_og() -> Image.Image:
    W, H = 1200, 630
    base = Image.new("RGB", (W, H), PINE_DEEP)
    draw = ImageDraw.Draw(base)

    # Atmospheric gradients
    for y in range(H):
        t = y / H
        r = int(PINE_DEEP[0] * (1 - t) + PINE_MID[0] * t)
        g = int(PINE_DEEP[1] * (1 - t) + PINE_MID[1] * t)
        b = int(PINE_DEEP[2] * (1 - t) + PINE_MID[2] * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Soft brass glow top-left (text side)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    for i, alpha in enumerate((55, 32, 16)):
        pad = 40 * i
        gdraw.ellipse(
            (-180 + pad, -220 + pad, 520 - pad, 420 - pad),
            fill=(*BRASS, alpha),
        )
    base = Image.alpha_composite(base.convert("RGBA"), glow).convert("RGBA")

    # Product collage layer
    collage = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rng = random.Random(42)

    existing = []
    for rel in PICKS:
        p = PRODUCTS / rel
        if p.exists():
            existing.append(p)
    # Fill if some missing
    if len(existing) < 18:
        for p in sorted(PRODUCTS.rglob("*.png")):
            if "lifestyle" in str(p):
                continue
            if p not in existing:
                existing.append(p)
            if len(existing) >= 22:
                break

    # Positions: elegant right-side scatter in gentle arcs
    slots = []
    # Back row
    for i in range(8):
        slots.append((520 + i * 78, 70 + (i % 3) * 18, 210, -6 + (i % 5) * 2))
    # Mid row
    for i in range(7):
        slots.append((560 + i * 82, 230 + (i % 2) * 22, 245, 4 - (i % 4) * 2))
    # Front row
    for i in range(6):
        slots.append((600 + i * 90, 400 + (i % 3) * 12, 280, -3 + i))

    for idx, (x, y, th, rot) in enumerate(slots):
        if idx >= len(existing):
            break
        prod = prepare_product(existing[idx], th)
        # Soft shadow
        shadow = Image.new("RGBA", (prod.width + 24, prod.height + 24), (0, 0, 0, 0))
        s = Image.new("RGBA", prod.size, (0, 0, 0, 70))
        s.putalpha(prod.split()[-1].point(lambda a: int(a * 0.35)))
        shadow.paste(s, (8, 12), s)
        shadow = shadow.filter(ImageFilter.GaussianBlur(10))
        rotated = prod.rotate(rot + rng.uniform(-2, 2), resample=Image.Resampling.BICUBIC, expand=True)
        sh_rot = shadow.rotate(rot, resample=Image.Resampling.BICUBIC, expand=True)
        collage.alpha_composite(sh_rot, (int(x - sh_rot.width / 2), int(y - sh_rot.height / 2 + 8)))
        collage.alpha_composite(rotated, (int(x - rotated.width / 2), int(y - rotated.height / 2)))

    # Left-to-right fade so text stays legible
    fade = Image.new("L", (W, H), 255)
    fdraw = ImageDraw.Draw(fade)
    for x in range(W):
        if x < 420:
            a = 0
        elif x < 720:
            a = int(255 * ((x - 420) / 300))
        else:
            a = 255
        fdraw.line([(x, 0), (x, H)], fill=a)

    r, g, b, a = collage.split()
    a = ImageChops.multiply(a, fade)
    collage = Image.merge("RGBA", (r, g, b, a))

    base = Image.alpha_composite(base, collage)

    # Text
    draw = ImageDraw.Draw(base)
    font_eyebrow = load_font("WorkSans-500.ttf", 22)
    font_title = load_font("Fraunces-500.ttf", 72)
    font_sub = load_font("Fraunces-400.ttf", 28)
    font_foot = load_font("WorkSans-400.ttf", 18)

    eyebrow = "RINGANA WITH TAYLOR"
    # letter-spacing simulation
    ex_x = 72
    for ch in eyebrow:
        draw.text((ex_x, 168), ch, font=font_eyebrow, fill=BRASS_LIGHT)
        bbox = draw.textbbox((0, 0), ch, font=font_eyebrow)
        ex_x += (bbox[2] - bbox[0]) + 4

    # Title — two lines for elegance
    draw.text((72, 210), "Get your", font=font_title, fill=LINEN)
    draw.text((72, 290), "Fresh Match", font=font_title, fill=LINEN)

    # Brass rule
    draw.rounded_rectangle((72, 390, 200, 396), radius=2, fill=BRASS)

    draw.text(
        (72, 418),
        "Your Ringana shortlist — matched to you.",
        font=font_sub,
        fill=(220, 214, 200),
    )
    draw.text((72, 560), "tayrourke.github.io/the-fresh-match", font=font_foot, fill=(160, 175, 162))

    return base.convert("RGB")


def make_favicon_png(size: int) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    pad = max(1, size // 16)
    draw.rounded_rectangle(
        (pad, pad, size - pad - 1, size - pad - 1),
        radius=max(4, size // 5),
        fill=PINE,
    )
    # brass accent arc
    m = size // 2
    draw.arc(
        (size * 0.42, size * 0.08, size * 0.95, size * 0.55),
        start=200,
        end=420,
        fill=BRASS,
        width=max(1, size // 18),
    )
    # F mark
    try:
        font = load_font("Fraunces-500.ttf", int(size * 0.55))
    except Exception:
        font = ImageFont.load_default()
    text = "F"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        ((size - tw) / 2 - bbox[0], (size - th) / 2 - bbox[1] - size * 0.02),
        text,
        font=font,
        fill=LINEN,
    )
    return im


def write_favicon_svg(path: Path):
    path.write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="7" fill="#1c3227"/>
  <path d="M22.5 6.5c3.2 1.2 5 4.2 4.2 7.4" stroke="#cfa95e" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/>
  <text x="16" y="22.5" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="15" font-weight="600" fill="#f6f2ea">F</text>
</svg>
""",
        encoding="utf-8",
    )


def main():
    og = make_og()
    og_path = PUBLIC / "og-share.png"
    og.save(og_path, "PNG", optimize=True)
    print("wrote", og_path, og.size)

    write_favicon_svg(PUBLIC / "favicon.svg")
    print("wrote favicon.svg")

    fav32 = make_favicon_png(32)
    fav32.save(PUBLIC / "favicon-32.png", "PNG")
    fav180 = make_favicon_png(180)
    fav180.save(PUBLIC / "apple-touch-icon.png", "PNG")
    print("wrote favicon-32.png + apple-touch-icon.png")


if __name__ == "__main__":
    main()
