#!/usr/bin/env python3
# Generate PWA launcher icons from public/gt-logo-white.png. Run with:
#   python3 scripts/gen-icons.py
# Writes PNGs into public/icons/.
#
# Two purposes:
#   - regular (any):     full-bleed copy of the logo, used for the Apple
#                        touch icon and any non-masked Android contexts.
#   - maskable:          logo scaled into the Android adaptive-icon safe
#                        zone (centre 80%) on a black canvas so the
#                        launcher's circular/squircle mask doesn't clip
#                        it.

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public"
SRC = ROOT / "gt-logo-white.png"
OUT = ROOT / "icons"
OUT.mkdir(parents=True, exist_ok=True)

BG = (0, 0, 0, 255)  # logo art is white on black; keep it cohesive.


def _resize(size: int) -> Image.Image:
    return Image.open(SRC).convert("RGBA").resize((size, size), Image.LANCZOS)


def _maskable(size: int) -> Image.Image:
    # 80% safe zone — leaves 10% padding on every side so circular masks
    # never clip the logo's strokes.
    inner = int(size * 0.80)
    canvas = Image.new("RGBA", (size, size), BG)
    art = _resize(inner)
    off = (size - inner) // 2
    canvas.paste(art, (off, off), art)
    return canvas


def main() -> None:
    for size in (192, 512):
        _resize(size).save(OUT / f"icon-{size}.png", "PNG", optimize=True)
        _maskable(size).save(OUT / f"icon-{size}-maskable.png", "PNG", optimize=True)
    # iOS expects a 180px Apple-touch-icon.
    _resize(180).save(OUT / "apple-touch-icon.png", "PNG", optimize=True)
    print(f"Wrote icons into {OUT}")


if __name__ == "__main__":
    main()
