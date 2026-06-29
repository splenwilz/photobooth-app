#!/usr/bin/env python3
"""
Generate BoothIQ app-icon, splash and favicon assets directly from the two brand
JPEGs (no editable/transparent source available, so backgrounds are machine-keyed).

This project uses Expo CNG: ios/ and android/ are gitignored and regenerated from
app.json on `expo prebuild`. So this script ONLY writes assets/images/; run
`npx expo prebuild --clean` afterwards to regenerate native assets.

Sources (the WhatsApp exports in ~/Downloads):
  ICON_JPG   - composed app icon: teal mark on a charcoal rounded square (white outside)
  SHEET_JPG  - 2x2 brand sheet; top-right panel = white "BoothIQ" stacked lockup on black

Outputs (assets/images/):
  icon.png                       1024  color mark on opaque charcoal (no alpha)
  favicon.png                    48    color mark on charcoal (opaque)
  splash-icon.png / splash-logo  1024  lockup, transparent  (variant chosen below)
  splash-icon-white.png          1024  white lockup  (preview for teal bg)
  splash-icon-color.png          1024  color lockup  (preview for charcoal bg)
  android-icon-foreground.png    1024  color mark, transparent, safe-zone
  android-icon-background.png    1024  solid charcoal square
  android-icon-monochrome.png    1024  white silhouette, transparent

Re-runnable. Requires Pillow.
"""
import os
from PIL import Image, ImageDraw

HOME = os.path.expanduser("~")
ICON_JPG = os.environ.get("BOOTHIQ_ICON",
                          os.path.join(HOME, "Downloads/WhatsApp Image 2026-06-02 at 23.46.55.jpeg"))
SHEET_JPG = os.environ.get("BOOTHIQ_SHEET",
                           os.path.join(HOME, "Downloads/WhatsApp Image 2026-06-02 at 23.31.23.jpeg"))

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.abspath(os.path.join(HERE, ".."))
IMAGES = os.path.join(APP, "assets/images")

# Brand palette (sampled from the artwork)
TEAL = (6, 148, 148)
CHARCOAL = (16, 20, 21)
CHARCOAL_A = CHARCOAL + (255,)
WHITE = (255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)

# Which splash variant feeds splash-icon.png: "white" (teal bg) or "color" (charcoal bg)
SPLASH_VARIANT = os.environ.get("BOOTHIQ_SPLASH", "white")


# ---------- generic helpers ----------
def fit_into(art, box):
    w, h = art.size
    s = box / max(w, h)
    return art.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)


def centered_on(art, size, bg):
    canvas = Image.new("RGBA", (size, size), bg)
    canvas.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return canvas


def luma_alpha(rgb, lo, hi):
    """Build an alpha mask from luminance: pixels darker than `lo` -> transparent,
    brighter than `hi` -> opaque, linear between. Keys a dark background out while
    keeping bright/colored foreground."""
    L = rgb.convert("L")
    span = max(1, hi - lo)
    return L.point(lambda p: 0 if p < lo else (255 if p > hi else int((p - lo) * 255 / span)))


def trimmed(rgba):
    bbox = rgba.split()[3].getbbox()
    return rgba.crop(bbox) if bbox else rgba


def strong_crop(rgba, thr=150, pad=0.05):
    """Crop to the *solid* (high-alpha) content, dropping thin faint outlines/rims
    that a plain alpha bbox would keep."""
    strong = rgba.split()[3].point(lambda p: 255 if p > thr else 0)
    bbox = strong.getbbox()
    if not bbox:
        return rgba
    p = round(pad * max(bbox[2] - bbox[0], bbox[3] - bbox[1]))
    box = (max(0, bbox[0] - p), max(0, bbox[1] - p),
           min(rgba.width, bbox[2] + p), min(rgba.height, bbox[3] + p))
    return rgba.crop(box)


def save(im, name):
    path = os.path.join(IMAGES, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)
    print(f"  wrote {os.path.relpath(path, APP)}  ({im.width}x{im.height}, {im.mode})")


# ---------- source extraction ----------
def icon_square():
    """The mark on a full charcoal square: flood the outer white away to charcoal,
    crop to the square. Corner fidelity is irrelevant (the OS masks icon corners)."""
    im = Image.open(ICON_JPG).convert("RGB")
    # recolor the outer white background (connected from each corner) to charcoal
    for seed in [(0, 0), (im.width - 1, 0), (0, im.height - 1), (im.width - 1, im.height - 1)]:
        ImageDraw.floodfill(im, seed, CHARCOAL, thresh=130)
    gray = im.convert("L").point(lambda p: 0 if abs(p - 18) < 14 else 255)  # content vs charcoal
    bbox = gray.getbbox() or (0, 0, im.width, im.height)
    # pad the crop slightly so we keep the designer's charcoal margin around the mark
    pad = round(0.06 * max(bbox[2] - bbox[0], bbox[3] - bbox[1]))
    box = (max(0, bbox[0] - pad), max(0, bbox[1] - pad),
           min(im.width, bbox[2] + pad), min(im.height, bbox[3] + pad))
    return im.crop(box).convert("RGBA")


def color_mark():
    """Just the teal+white mark, transparent (key the charcoal out of icon_square).
    The charcoal has a gradient (~L16 edges .. L48 center), so key high enough to
    remove all of it; teal (L~105) and white stay opaque."""
    sq = icon_square()
    # crop to the central area first: the symbol lives in the middle ~64%, while the
    # rounded-square edge rim lives at the border -- excluding it kills the rim.
    w, h = sq.size
    m = round(0.18 * min(w, h))
    sq = sq.crop((m, m, w - m, h - m))
    sq.putalpha(luma_alpha(sq.convert("RGB"), 52, 85))
    return trimmed(sq)


def lockup(force_white):
    """Extract the stacked 'BoothIQ' lockup from the sheet's top-right (white-on-black)
    panel. force_white=True -> solid white silhouette; else keep original colors.
    Crops a centered box well inside the panel's bright border frame (the logo is
    centered), then keys the black background out."""
    sheet = Image.open(SHEET_JPG).convert("RGB")
    panel = sheet.crop((930, 134, 1450, 654))          # centered, inside the TR panel frame
    alpha = luma_alpha(panel, 30, 65)                  # black bg + JPEG noise out
    if force_white:
        out = Image.new("RGBA", panel.size, WHITE + (0,))
    else:
        out = panel.convert("RGBA")
    out.putalpha(alpha)
    return strong_crop(out)


# ---------- main ----------
def main():
    print(f"icon source : {ICON_JPG}")
    print(f"sheet source: {SHEET_JPG}")
    print("Generating assets/images/ (CNG: native comes from prebuild):")

    sq = icon_square()
    cmark = color_mark()

    # icon.png -- charcoal square at ~98% (thin charcoal frame), flattened (no alpha)
    icon = centered_on(fit_into(sq, round(1024 * 0.98)), 1024, CHARCOAL_A).convert("RGB")
    save(icon, "icon.png")

    # favicon.png
    save(centered_on(fit_into(sq, round(48 * 0.98)), 48, CHARCOAL_A).convert("RGB"), "favicon.png")

    # splash previews (both variants) + the chosen one as splash-icon/splash-logo
    white_splash = centered_on(fit_into(lockup(True), round(1024 * 0.66)), 1024, TRANSPARENT)
    color_splash = centered_on(fit_into(lockup(False), round(1024 * 0.66)), 1024, TRANSPARENT)
    save(white_splash, "splash-icon-white.png")
    save(color_splash, "splash-icon-color.png")
    chosen = white_splash if SPLASH_VARIANT == "white" else color_splash
    save(chosen, "splash-icon.png")
    save(chosen, "splash-logo.png")

    # android adaptive trio
    save(centered_on(fit_into(cmark, round(1024 * 0.58)), 1024, TRANSPARENT),
         "android-icon-foreground.png")
    save(Image.new("RGBA", (1024, 1024), CHARCOAL_A), "android-icon-background.png")
    white_mark = Image.new("RGBA", cmark.size, WHITE + (0,)); white_mark.putalpha(cmark.split()[3])
    save(centered_on(fit_into(white_mark, round(1024 * 0.58)), 1024, TRANSPARENT),
         "android-icon-monochrome.png")

    print(f"Done (splash variant: {SPLASH_VARIANT}).")
    print("Next: review splash-icon-white.png vs splash-icon-color.png, then")
    print("      npx expo prebuild --clean")


if __name__ == "__main__":
    main()
