#!/usr/bin/env python3
"""Generate favicon + artsy OG share image (brand-matched typography)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
PRODUCTS = PUBLIC / "products"
FONTS = Path(__file__).resolve().parent / "fonts"

# Match Ringana-with-Taylor brand card
PINE = (28, 50, 39)  # #1c3227-ish
PINE_DEEP = (20, 34, 27)
BRASS = (184, 149, 74)  # muted gold like the ornament
CREAM = (236, 230, 214)  # soft cream like the brand card


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size=size)


def paper_texture(size: tuple[int, int], base_rgb: tuple[int, int, int]) -> Image.Image:
    """Subtle paper grain over deep pine — like the brand card."""
    w, h = size
    base = Image.new("RGB", size, base_rgb)
    # soft vertical vignette
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in range(h):
        t = abs(y - h / 2) / (h / 2)
        a = int(28 * (t**1.4))
        od.line([(0, y), (w, y)], fill=(0, 0, 0, a))
    base = Image.alpha_composite(base.convert("RGBA"), overlay)

    noise = Image.effect_noise((w, h), 28).convert("L")
    noise = ImageEnhance.Contrast(noise).enhance(1.2)
    grain = Image.merge("RGB", (noise, noise, noise)).convert("RGBA")
    grain.putalpha(22)
    return Image.alpha_composite(base, grain).convert("RGBA")


def prepare_product(path: Path, target_h: int) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    alpha = im.split()[-1]
    bbox = alpha.getbbox()
    if bbox:
        im = im.crop(bbox)
    w, h = im.size
    scale = target_h / h
    return im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)


def paste_product(canvas: Image.Image, prod: Image.Image, cx: int, cy: int, rot: float = 0):
    shadow = Image.new("RGBA", (prod.width + 40, prod.height + 40), (0, 0, 0, 0))
    s = Image.new("RGBA", prod.size, (0, 0, 0, 90))
    s.putalpha(prod.split()[-1].point(lambda a: int(a * 0.4)))
    shadow.paste(s, (12, 16), s)
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))

    rotated = prod.rotate(rot, resample=Image.Resampling.BICUBIC, expand=True)
    sh = shadow.rotate(rot, resample=Image.Resampling.BICUBIC, expand=True)
    canvas.alpha_composite(sh, (int(cx - sh.width / 2), int(cy - sh.height / 2 + 10)))
    canvas.alpha_composite(rotated, (int(cx - rotated.width / 2), int(cy - rotated.height / 2)))


def draw_ornament(draw: ImageDraw.ImageDraw, cx: int, y: int, half_w: int = 70):
    """Thin gold rule with diamond center — matches brand card."""
    draw.line([(cx - half_w, y), (cx - 7, y)], fill=BRASS, width=1)
    draw.line([(cx + 7, y), (cx + half_w, y)], fill=BRASS, width=1)
    # diamond
    d = 4
    draw.polygon([(cx, y - d), (cx + d, y), (cx, y + d), (cx - d, y)], fill=BRASS)


def text_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> int:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def draw_spaced(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    font: ImageFont.FreeTypeFont,
    fill,
    canvas_w: int,
    tracking: float = 0,
):
    """Centered text with optional letter-spacing (em-ish)."""
    widths = []
    for ch in text:
        widths.append(text_width(draw, ch, font) if ch != " " else int(font.size * 0.35))
    total = sum(widths) + tracking * max(0, len(text) - 1)
    x = (canvas_w - total) / 2
    for i, ch in enumerate(text):
        draw.text((x, y), ch, font=font, fill=fill)
        x += widths[i] + tracking


def make_og() -> Image.Image:
    W, H = 1200, 630
    base = paper_texture((W, H), PINE_DEEP)
    draw = ImageDraw.Draw(base)

    font_display = load_font("Fraunces-400.ttf", 96)
    font_with = load_font("Fraunces-400-Italic.ttf", 46)
    font_tag = load_font("WorkSans-400.ttf", 17)

    # —— Exact brand-card hierarchy ——
    draw_ornament(draw, W // 2, 128, half_w=86)

    ringana, with_w, taylor = "Ringana", "with", "Taylor"
    rw = text_width(draw, ringana, font_display)
    ww = text_width(draw, with_w, font_with)
    tw = text_width(draw, taylor, font_display)

    draw.text(((W - rw) / 2, 168), ringana, font=font_display, fill=CREAM)
    draw.text(((W - ww) / 2, 278), with_w, font=font_with, fill=CREAM)
    draw.text(((W - tw) / 2, 328), taylor, font=font_display, fill=CREAM)

    draw_spaced(
        draw,
        "Get your Fresh Match.",
        455,
        font_tag,
        CREAM,
        W,
        tracking=4.0,
    )

    # Two products only — quiet corner still-life
    still = [
        (PRODUCTS / "fresh/fresh-hydro-serum.png", 220, 130, 555, -8, 0.85),
        (PRODUCTS / "fresh/fresh-cream-medium.png", 185, 1065, 550, 7, 0.85),
    ]
    for path, th, cx, cy, rot, opac in still:
        if not path.exists():
            continue
        prod = prepare_product(path, th)
        r, g, b, a = prod.split()
        a = a.point(lambda v, o=opac: int(v * o))
        prod = Image.merge("RGBA", (r, g, b, a))
        paste_product(base, prod, cx, cy, rot)

    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vig)
    for y in range(H - 100, H):
        alpha = int(80 * ((y - (H - 100)) / 100))
        vd.line([(0, y), (W, y)], fill=(*PINE_DEEP, alpha))
    base = Image.alpha_composite(base, vig)

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
    og_path = PUBLIC / "og-share.png"
    og.save(og_path, "PNG", optimize=True)
    print("wrote", og_path, og.size)

    write_favicon_svg(PUBLIC / "favicon.svg")
    make_favicon_png(32).save(PUBLIC / "favicon-32.png", "PNG")
    make_favicon_png(180).save(PUBLIC / "apple-touch-icon.png", "PNG")
    print("wrote favicons")


if __name__ == "__main__":
    main()
