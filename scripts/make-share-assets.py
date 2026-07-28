#!/usr/bin/env python3
"""Build favicon + OG share image.

The OG lockup (Ringana / with Taylor + ornament) is taken from the official
brand og-image so typography matches the landing page exactly. Only the
tagline and corner products are composited on top.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
FONTS = Path(__file__).resolve().parent / "fonts"
BRAND_OG = Path(__file__).resolve().parent / "brand-og-source.jpg"

PINE = (28, 50, 39)
BRASS = (184, 149, 74)
CREAM = (236, 230, 214)


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size=size)


def make_og() -> Image.Image:
    if not BRAND_OG.exists():
        raise SystemExit(
            f"Missing {BRAND_OG.name}. Download from "
            "https://tayrourke.github.io/tay-goes-fresh/og-image.jpg"
        )

    brand = Image.open(BRAND_OG).convert("RGB")
    # Brand is 1200x800 — crop to OG 1200x630 keeping the lockup
    top = 85
    base = brand.crop((0, top, 1200, top + 630))
    bg = base.getpixel((600, 30))

    # Cover original tagline
    cover = Image.new("RGB", (1200, 100), bg)
    noise = Image.effect_noise((1200, 100), 12).convert("L")
    grain = Image.merge("RGB", (noise, noise, noise))
    cover = Image.blend(cover, grain, 0.045)
    y0 = 500
    base.paste(cover, (0, y0))
    feather = base.crop((0, y0 - 12, 1200, y0 + 20)).filter(ImageFilter.GaussianBlur(3))
    base.paste(feather, (0, y0 - 12))

    # New tagline (Work Sans, tracked — same treatment as brand card)
    font = load_font("WorkSans-400.ttf", 16)
    text = "Get your Fresh Match."
    spacing = 4.0
    d = ImageDraw.Draw(base)
    widths = []
    for ch in text:
        bbox = d.textbbox((0, 0), ch, font=font)
        widths.append(bbox[2] - bbox[0] if ch != " " else int(font.size * 0.32))
    total = sum(widths) + spacing * (len(text) - 1)
    x = (1200 - total) / 2
    y = 535
    for i, ch in enumerate(text):
        d.text((x, y), ch, font=font, fill=CREAM)
        x += widths[i] + spacing

    def prep(path: Path, th: int, opac: float = 0.8) -> Image.Image:
        im = Image.open(path).convert("RGBA")
        a = im.split()[-1]
        bb = a.getbbox()
        if bb:
            im = im.crop(bb)
        w, h = im.size
        s = th / h
        im = im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.Resampling.LANCZOS)
        r, g, b, a = im.split()
        a = a.point(lambda v: int(v * opac))
        return Image.merge("RGBA", (r, g, b, a))

    out = base.convert("RGBA")
    for rel, th, cx, cy, rot in [
        ("products/fresh/fresh-hydro-serum.png", 200, 80, 575, -9),
        ("products/fresh/fresh-cream-medium.png", 170, 1120, 570, 8),
    ]:
        path = PUBLIC / rel
        if not path.exists():
            continue
        prod = prep(path, th).rotate(rot, expand=True, resample=Image.Resampling.BICUBIC)
        sh = Image.new("RGBA", (prod.width + 30, prod.height + 30), (0, 0, 0, 0))
        s = Image.new("RGBA", prod.size, (0, 0, 0, 60))
        s.putalpha(prod.split()[-1].point(lambda a: int(a * 0.3)))
        sh.paste(s, (10, 12), s)
        sh = sh.filter(ImageFilter.GaussianBlur(10))
        out.alpha_composite(sh, (int(cx - sh.width / 2), int(cy - sh.height / 2 + 8)))
        out.alpha_composite(prod, (int(cx - prod.width / 2), int(cy - prod.height / 2)))

    return out.convert("RGB")


def make_favicon_png(size: int) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    pad = max(1, size // 16)
    draw.rounded_rectangle(
        (pad, pad, size - pad - 1, size - pad - 1),
        radius=max(4, size // 5),
        fill=PINE,
    )
    draw.arc(
        (size * 0.42, size * 0.08, size * 0.95, size * 0.55),
        start=200,
        end=420,
        fill=BRASS,
        width=max(1, size // 18),
    )
    font = load_font("Fraunces-500.ttf", int(size * 0.55))
    text = "F"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        ((size - tw) / 2 - bbox[0], (size - th) / 2 - bbox[1] - size * 0.02),
        text,
        font=font,
        fill=CREAM,
    )
    return im


def write_favicon_svg(path: Path):
    path.write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="7" fill="#1c3227"/>
  <path d="M22.5 6.5c3.2 1.2 5 4.2 4.2 7.4" stroke="#b8954a" stroke-width="1.4" stroke-linecap="round" opacity="0.9"/>
  <text x="16" y="22.5" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="15" font-weight="600" fill="#ece6d6">F</text>
</svg>
""",
        encoding="utf-8",
    )


def main():
    og = make_og()
    og.save(PUBLIC / "og-share.png", "PNG", optimize=True)
    print("wrote", PUBLIC / "og-share.png")
    write_favicon_svg(PUBLIC / "favicon.svg")
    make_favicon_png(32).save(PUBLIC / "favicon-32.png", "PNG")
    make_favicon_png(180).save(PUBLIC / "apple-touch-icon.png", "PNG")
    print("wrote favicons")


if __name__ == "__main__":
    main()
