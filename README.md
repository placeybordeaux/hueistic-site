# hueistic-site

The public site for **Hue-istic**, an Android home screen launcher that sorts your apps by
icon color. Two pages: a landing page and the privacy policy.

Live at <https://placeybordeaux.github.io/hueistic-site/>.

## The one thing that must not move

The app has the policy URL compiled into it:

```java
// app/src/main/java/com/colorpicker/launcher/Settings.java
public static final String PRIVACY_POLICY_URL = "https://placeybordeaux.github.io/hueistic-site/privacy";
```

Settings → About → **Privacy policy** in the app shows the policy text from a bundled copy and
offers a "View online" button that opens exactly that address, and the same URL goes in Play
Console under Policy → App content → Privacy policy. So:

- **Do not rename this repository**, do not move `privacy.html`, and do not put the site under a
  subdirectory. Any of those turns a shipped button into a 404.
- If the address ever has to change, change `Settings.PRIVACY_POLICY_URL` and Play Console in
  the same breath, and only in a release that goes out afterwards.

The in-app policy text does not depend on this page loading, which is why a broken link here is
embarrassing rather than a policy violation — but Play does check that the URL is reachable.

## Layout

```
index.html          landing page — hand-written, edit directly
privacy.html        GENERATED from privacy.md; do not edit
privacy.md          the policy text — a verbatim copy of the app repo's play-listing/PRIVACY.md
assets/css/site.css hand-written
assets/js/reel.js   hand-written — the hero reel's two modes
assets/shots/*.webp GENERATED from raw/*.png
assets/img/icon-*   GENERATED from icon-512.png; og.png is generated too
assets/video/       the sizzle reel, if one has been recorded (see below)
raw/*.png           full-resolution device screenshots, the source for assets/shots
tools/build.py      the generator
```

Nothing here loads a font, a script, an image or anything else from another server, and nothing
sets a cookie. That is not incidental: the app's entire pitch is that it sends nothing anywhere,
and a landing page for it that phoned a CDN would be arguing the opposite in the first place a
sceptical reader looks. Keep it that way — no Google Fonts, no analytics, no embeds.

## Rebuilding

```sh
python3 tools/build.py --help      # what it does
python3 tools/build.py --dry-run   # what it would write
python3 tools/build.py             # write it
python3 tools/build.py --check     # exit 1 if privacy.html is stale (for CI or a pre-push hook)
```

It needs Pillow. On a machine with no pip:

```sh
nix shell nixpkgs#python3Packages.pillow -c python3 tools/build.py
```

### When the privacy policy changes

`play-listing/PRIVACY.md` in the app repo is the source of truth — a Robolectric test
(`PrivacyPolicyTest`) already keeps it identical to the copy shipped inside the APK. This repo
holds a third copy. So:

```sh
cp ../hueistic/play-listing/PRIVACY.md privacy.md
python3 tools/build.py --only privacy
git commit -am "Privacy policy: <what changed>"
```

Bump the effective date at the top of `PRIVACY.md` first; it is rendered straight through.

### When the screenshots change

`raw/` holds the full-resolution captures off the test phone. Replace a file, keep the name, and
re-run the build; the names are load-bearing, since `index.html` references
`assets/shots/<name>.webp`.

Capture them with `tools/site-capture.py` in the app repo, which handles the three things that
make a device screenshot publishable:

- **A clean status bar**, via SystemUI demo mode — a fixed 12:00, no notification icons, no
  DND moon, no network-speed readout.
- **A masked app list.** `--mask` disables the packages in `tools/screenshot-hide.txt` for the
  length of the shoot and re-enables them after. That file is not a "safe apps" list — the
  density of the drawer is the product — it is the ~30 apps that identify the person holding
  the phone rather than the kind of person who might buy this: a daycare app, travel documents,
  banks, six password managers and authenticators, a utility that names the province.
- **All nine views.** Six are locked in the release build, so `--launch` drives the debug
  build's fake unlock instead. The mode button's cycle starts wherever the drawer was left, so
  the capture slugs are positional guesses — check them against each view before renaming.

## The sizzle reel

`assets/video/sizzle.mp4` and `sizzle.webm` are a recorded run of the app on a real phone —
home screen, the Honeycomb spiral, a search typed one letter at a time, and back out through
Rainbow and Mosaic. They are optional: `reel.js` asks for the mp4 with a `HEAD` request before
showing the **Video / Stills** switch, so with no recording the page shows the captioned stills
and no dead button. Re-record with `tools/site-capture.py --reel --mask` in the app repo.

Two things about how it is made, because neither is obvious:

- **It is recorded with scrcpy, not `screenrecord`.** The test phone's OxygenOS refuses
  `screenrecord` every way it can be asked — to `/sdcard`, to `/data/local/tmp`, to stdout, all
  "Permission denied" while the same shell writes those paths happily. Grabbing stills and
  assembling them runs at 0.54 fps, which is a slideshow. scrcpy captures through MediaCodec
  from its own pushed server, which the vendor policy does not block.
- **The search happens on Honeycomb on purpose.** `CanvasDrawerView.setQuery` filters *in
  place* — every app holds its position while the non-matches fade and shrink — and that is the
  whole reason the sequence is in the reel. The Rainbow grid rebuilds instead, which looks like
  any other launcher. The capture script classifies the visible view from a screenshot and taps
  the mode button until it is on Honeycomb before recording starts, because the first take
  landed on Rainbow purely by chance.

Two presentations rather than one because which of them actually sells the app is a real
question — a recording shows the animation and the responsiveness, and a captioned still lets
someone read what they are looking at. The switch is for deciding, and it is cheap to delete the
losing half later.

## Release state: the call to action

The app is not on Google Play yet, so the site does not pretend it is. Two blocks in
`index.html` are marked `##RELEASE-STATE##`; both currently say "coming soon" and offer an email.
This mirrors `ComingSoon.ACTIVE` in the app, which shows a *coming soon* page rather than a
purchase flow for the same reason.

**On the day it goes live**, flip both. The hero's block becomes:

```html
<p class="status"><span class="dot" aria-hidden="true"></span> Free on Google Play</p>
<div class="cta-row" id="get">
  <a class="btn btn-primary" href="https://play.google.com/store/apps/details?id=com.hueistic.launcher">
    Get it on Google Play
  </a>
  <a class="btn btn-ghost" href="#views">See all nine views</a>
</div>
<p class="cta-note">Free. The six extra views are one optional purchase, yours for good.</p>
```

and the closing block's primary button becomes the same Play link. At the same time:

- `ComingSoon.ACTIVE` → `false` in the app, shipped as its own release;
- the "On the way" section here loses its `Soon` tags and its "when it lands" hedges;
- `play-listing/listing.md` and `PLAY_CONSOLE_CHECKLIST.md` in the app repo each carry a note
  saying which of their sentences revert at the same moment.

Until then, every sentence on this site that touches the purchase is written for a thing that
cannot be bought today, on purpose.

## Hosting

GitHub Pages, `main` branch, `/` root. There is a `.nojekyll` file: the site is plain static
HTML and has no use for Jekyll, and skipping it removes a build step that could fail.
