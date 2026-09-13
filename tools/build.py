#!/usr/bin/env python3
"""Build the derived parts of the Hue-istic site: web images and privacy.html.

Two things are generated and therefore must never be hand-edited:

  raw/*.png    -> assets/shots/*.webp          (device screenshots, resized twice)
  privacy.md   -> privacy.html                 (the policy, wrapped in the site chrome)

`privacy.md` is a verbatim copy of `play-listing/PRIVACY.md` in the app repo, which is the
source of truth (a Robolectric test keeps it identical to the copy shipped inside the app).
Copy it across and re-run this script when the policy changes; --check will tell you whether
the committed privacy.html is stale without writing anything.

Everything else on the site is hand-written HTML/CSS and is not touched here.
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
SHOTS = ROOT / "assets" / "shots"
IMG = ROOT / "assets" / "img"

# Two widths per shot: the card size the grid asks for, and a 2x for dense displays. The phone
# captures are 1272 px wide, so 1272 is native and anything above it would be upscaling.
SHOT_WIDTHS = (620, 1240)
# WebP quality. These are UI screenshots — flat color and hard edges — so they stay clean much
# further down than a photograph would.
WEBP_QUALITY = 82

# The app's own brand, from app/src/main/res/drawable/ic_launcher_foreground.xml.
STRIPES = ["#E53935", "#FB8C00", "#FDD835", "#43A047", "#1E88E5", "#8E24AA"]
INK = "#222222"


def need_pillow():
    """Fail with the fix rather than a bare ImportError — this is a NixOS machine with no pip."""
    try:
        from PIL import Image, ImageDraw  # noqa: F401
    except ImportError:
        sys.exit(
            "Pillow is required and is not importable.\n"
            "  nix shell nixpkgs#python3Packages.pillow -c python3 tools/build.py\n"
            "or point PYTHONPATH at a Pillow site-packages directory."
        )


# --------------------------------------------------------------------------------------
# Images
# --------------------------------------------------------------------------------------


def build_shots(dry_run: bool) -> list[str]:
    from PIL import Image

    if not RAW.is_dir():
        sys.exit(f"no raw/ directory at {RAW} — nothing to resize")
    sources = sorted(RAW.glob("*.png"))
    if not sources:
        sys.exit(f"{RAW} contains no .png — refusing to build a site with no screenshots")

    done = []
    for src in sources:
        for width in SHOT_WIDTHS:
            suffix = "" if width == SHOT_WIDTHS[0] else "@2x"
            out = SHOTS / f"{src.stem}{suffix}.webp"
            if dry_run:
                done.append(f"would write {out.relative_to(ROOT)} ({width}px wide)")
                continue
            im = Image.open(src).convert("RGB")
            if im.width < width:
                # Upscaling a screenshot only adds weight. Say so rather than doing it quietly.
                print(f"  note: {src.name} is {im.width}px wide, below {width}px — kept native")
                width = im.width
            h = round(im.height * width / im.width)
            im = im.resize((width, h), Image.LANCZOS)
            SHOTS.mkdir(parents=True, exist_ok=True)
            im.save(out, "WEBP", quality=WEBP_QUALITY, method=6)
            done.append(f"{out.relative_to(ROOT)}  {width}x{h}  {out.stat().st_size // 1024} KB")
    return done


def build_icons(dry_run: bool) -> list[str]:
    from PIL import Image

    src = IMG / "icon-512.png"
    if not src.is_file():
        sys.exit(f"missing {src.relative_to(ROOT)} — copy it from the app repo's play-listing/")
    out = []
    for size in (180, 192, 32):
        dst = IMG / f"icon-{size}.png"
        if dry_run:
            out.append(f"would write {dst.relative_to(ROOT)}")
            continue
        Image.open(src).convert("RGBA").resize((size, size), Image.LANCZOS).save(dst)
        out.append(str(dst.relative_to(ROOT)))
    return out


def build_og(dry_run: bool) -> list[str]:
    """The 1200x630 card that link previews show.

    Drawn rather than screenshotted: a preview card is read at thumbnail size in a feed, where a
    scaled-down phone screenshot is an unreadable smear. The icon, the name and one line of
    promise survive that scale; the app's own screenshots are on the page itself.
    """
    from PIL import Image, ImageDraw

    dst = IMG / "og.png"
    if dry_run:
        return [f"would write {dst.relative_to(ROOT)} (1200x630)"]

    W, H = 1200, 630
    card = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(card)

    # A full-bleed rainbow bar along the top edge: the icon's own motif, readable at any scale.
    bar = 14
    seg = W / len(STRIPES)
    for i, c in enumerate(STRIPES):
        d.rectangle([round(i * seg), 0, round((i + 1) * seg), bar], fill=c)

    icon = Image.open(IMG / "icon-512.png").convert("RGBA").resize((260, 260), Image.LANCZOS)
    card.paste(icon, (96, 150), icon)

    # Pillow's default bitmap font is tiny and does not scale, so the wordmark is drawn from the
    # same stripe geometry as the icon rather than set in type. No font file to ship, and it
    # cannot render differently on another machine.
    x0, y0 = 430, 196
    d.text((x0, y0), "HUE-ISTIC", fill="#FFFFFF")
    for i, line in enumerate(
        ["A launcher that sorts your apps by color.", "Find apps the way you remember them."]
    ):
        d.text((x0, y0 + 40 + i * 22), line, fill="#BDBDBD")
    card.save(dst)
    return [f"{dst.relative_to(ROOT)}  {W}x{H}  {dst.stat().st_size // 1024} KB"]


# --------------------------------------------------------------------------------------
# privacy.md -> privacy.html
# --------------------------------------------------------------------------------------

# A deliberately small Markdown subset: exactly the constructs PRIVACY.md uses. A general
# Markdown library would be a dependency for one 84-line file, and a silent misrender of a
# privacy policy is the kind of thing nobody notices.
INLINE = [
    (re.compile(r"\[([^\]]+)\]\(([^)]+)\)"), r'<a href="\2" rel="noopener">\1</a>'),
    (re.compile(r"(?<![\w.@])([\w.+-]+@[\w-]+\.[\w.]+)"), r'<a href="mailto:\1">\1</a>'),
    (re.compile(r"\*\*([^*]+)\*\*"), r"<strong>\1</strong>"),
    (re.compile(r"(?<!\*)\*([^*]+)\*(?!\*)"), r"<em>\1</em>"),
    (re.compile(r"_([^_]+)_"), r"<em>\1</em>"),
]


def inline(text: str) -> str:
    out = html.escape(text, quote=False)
    for pattern, repl in INLINE:
        out = pattern.sub(repl, out)
    return out


def md_to_html(md: str) -> tuple[str, str]:
    """Return (title, body_html). Raises on anything the subset does not understand."""
    title = ""
    parts: list[str] = []
    para: list[str] = []
    items: list[str] = []

    def flush_para():
        if para:
            parts.append(f"<p>{inline(' '.join(para))}</p>")
            para.clear()

    def flush_list():
        if items:
            lis = "".join(f"<li>{inline(i)}</li>" for i in items)
            parts.append(f"<ul>{lis}</ul>")
            items.clear()

    for line in md.splitlines():
        stripped = line.strip()
        if not stripped:
            flush_para()
            flush_list()
        elif stripped.startswith("## "):
            flush_para()
            flush_list()
            text = stripped[3:]
            slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
            parts.append(f'<h2 id="{slug}">{inline(text)}</h2>')
        elif stripped.startswith("# "):
            flush_para()
            flush_list()
            title = stripped[2:]
            parts.append(f"<h1>{inline(title)}</h1>")
        elif stripped.startswith("- "):
            flush_para()
            items.append(stripped[2:])
        elif items and line.startswith("  "):
            # A wrapped continuation of the current bullet.
            items[-1] += " " + stripped
        else:
            flush_list()
            para.append(stripped)
    flush_para()
    flush_list()
    if not title:
        sys.exit("privacy.md has no `# ` heading — refusing to build a page with no title")
    return title, "\n".join(parts)


PRIVACY_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{tab_title}</title>
<meta name="description" content="Hue-istic collects no data. The full privacy policy for the Hue-istic Android launcher.">
<link rel="icon" href="assets/img/icon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="assets/img/icon-180.png">
<link rel="stylesheet" href="assets/css/site.css">
</head>
<body class="page-doc">
<a class="skip" href="#doc">Skip to the policy</a>
<header class="bar">
  <a class="mark" href="./">
    <span class="mark-icon" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
    <span class="mark-name">HUE-ISTIC</span>
  </a>
  <nav class="bar-nav"><a href="./">Home</a></nav>
</header>

<main id="doc" class="doc">
{body}
</main>

<footer class="foot">
  <p><a href="./">Hue-istic</a> &middot; <a href="privacy">Privacy policy</a> &middot;
     <a href="mailto:placeybordeaux@gmail.com">placeybordeaux@gmail.com</a></p>
  <p class="foot-fine">This page loads no fonts, scripts, or images from anyone else, and sets no cookies.</p>
</footer>
</body>
</html>
"""


def build_privacy(dry_run: bool, check: bool) -> list[str]:
    src = ROOT / "privacy.md"
    if not src.is_file():
        sys.exit("privacy.md is missing — copy play-listing/PRIVACY.md from the app repo")
    title, body = md_to_html(src.read_text())
    # "Hue-istic Privacy Policy · Hue-istic" stutters in a tab strip; drop the duplicated name.
    tab = re.sub(r"^Hue-istic\s+", "", title)
    page = PRIVACY_TEMPLATE.format(tab_title=html.escape(f"{tab} · Hue-istic"), body=body)
    dst = ROOT / "privacy.html"

    if check:
        current = dst.read_text() if dst.is_file() else ""
        if current != page:
            sys.exit("privacy.html is stale — run `python3 tools/build.py` and commit the result")
        return ["privacy.html is up to date with privacy.md"]
    if dry_run:
        return [f"would write privacy.html ({len(page)} bytes) from privacy.md"]
    dst.write_text(page)
    return [f"privacy.html  {dst.stat().st_size // 1024} KB  (title: {title!r})"]


# --------------------------------------------------------------------------------------


def main() -> None:
    p = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    p.add_argument("--dry-run", action="store_true", help="print what would be written, write nothing")
    p.add_argument("--check", action="store_true", help="exit non-zero if privacy.html is stale")
    p.add_argument("--only", choices=["shots", "icons", "og", "privacy"], help="build one target")
    args = p.parse_args()

    if args.check:
        for line in build_privacy(dry_run=False, check=True):
            print(f"  {line}")
        return

    if args.only in (None, "shots", "icons", "og"):
        need_pillow()

    stages = [
        ("screenshots", lambda: build_shots(args.dry_run), "shots"),
        ("icons", lambda: build_icons(args.dry_run), "icons"),
        ("social card", lambda: build_og(args.dry_run), "og"),
        ("privacy policy", lambda: build_privacy(args.dry_run, check=False), "privacy"),
    ]
    # One stripe of the icon's rainbow per stage, so a long build reads as a progress bar.
    ansi = [196, 208, 220, 40, 33, 93]
    for i, (label, fn, key) in enumerate(stages):
        if args.only and args.only != key:
            continue
        print(f"\n\033[38;5;{ansi[i]}m▊\033[0m \033[1m{label}\033[0m")
        for line in fn():
            print(f"  {line}")
    bar = "".join(f"\033[38;5;{c}m▊\033[0m" for c in ansi)
    print(f"\n{bar} " + ("dry run, nothing written" if args.dry_run else "done"))


if __name__ == "__main__":
    main()
