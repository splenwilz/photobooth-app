# BoothIQ — App Store Screenshot Plan

A designed, caption-led, review-safe screenshot set for the iOS listing.
Generated deterministically by `tools/store-screenshots/` from real simulator
captures in `appstore-screenshots/raw/`. Captions here are final copy: Apple
machine-reads screenshot text, so treat every word as reviewed.

---

## 0. Ground truth (verified in this repo)

- **Raw captures are 1290×2796** (iPhone 16 Plus simulator). The generator
  composes them onto **1284×2778** canvases, the size App Store Connect
  lists for this app's iPhone 6.5" slot (also accepts 1242×2688).
- **`supportsTablet: true` in `app.json`** → Apple will also require a 13"
  iPad set (2064×2752) and review the iPad layout. Decision needed (§6).
- Output is **JPEG** (no alpha channel to trip ASC validation), under 8 MB,
  max 10 per device size.

## 1. The rules the whole set lives under

Apple OCRs every image. Hard constraints:

1. **No prices, no "free trial" in images.** Prices live in metadata where a
   mismatch is editable. Never screenshot the paywall or subscription sheet,
   and never bake template prices into caption copy (template store UI
   showing its own prices as real app data is fine; captions never quote
   them).
2. **No earnings promises.** We show the operator's own numbers ("your
   revenue", "today's takings"), never promise outcomes ("grow revenue",
   "earn more", "boost bookings"). Track and report, don't promise.
3. **No fake social proof.** No invented laurels, ratings, or "#1" claims.
   Slot 1 is reserved to add a real-ratings badge via PPO once reviews exist.
4. **Real UI only (Guideline 2.3.3).** Every shot is an actual simulator
   capture composed into a device frame with caption text around it. No
   mocked features, no Photoshopped values.
5. **No trademarks** in captions (no "iPhone" as a selling word, no
   competitor names), no emoji, no em dashes in caption copy.
6. **Demo data hygiene.** Same demo account in every capture, same
   status-bar time, believable numbers (6 booths, $2,339 today, 84.9% up),
   no empty states, no onboarding banners, no dev overlays.
7. **Companion honesty.** The set must read as a *companion* to booth
   hardware/software: fleet monitoring, not a photo-taking app. Nothing that
   implies the phone takes the photos.

## 2. Design system (one look, every frame)

| Token | Value |
|---|---|
| Ink / dark frames | `#101415` (the adaptive-icon ink) |
| Light background | `#EFF3F4` (the app's wash) |
| Accent | Brand teal `#069494`, one accent element per shot |
| Headline type | Geist SemiBold (from `assets/fonts/`), ~110 px, ink on light / white on ink |
| Small line | Geist Regular, ~44 px, secondary gray `#5C6B6B` |
| Wordmark | "Booth" in ink/white + "IQ" in teal (matches `components/brand-name.tsx`) |
| Device frame | CSS bezel: ink body, 22 px bezel, 110 px corner radius |

**v4 design (current): full-bleed.** After testing device-frame + proof-chip
iterations (v1–v3, archived in `tools/store-screenshots/out/`), the chosen
direction is Airbnb-style full-bleed: no device frame — a caption band in
the app's own background color on top, the raw capture filling the rest of
the canvas edge-to-edge. Cover and closer remain ink posters with framed
phones (traced iPhone SVG in `tools/store-screenshots/assets/`). Earlier
modes (chips, lift, anchor, fit) are retained in template.mjs for future
passes. A v5 pass with fresh inspiration is planned; bump `VERSION` in
shots.mjs to start it.

**Layout grammar** (borrowed from the highest converters, verified against
Shopify's and Square's current sets, saved in `inspiration/`):

- Frame 1 is a COVER: wordmark, definitional headline, three factual pills,
  and one tilted phone corner slicing in from the bottom edge.
- Feature frames: caption top-left, one teal tick above it, one big phone
  tilted -8° bleeding off the right and bottom edges, plus a floating PROOF
  CHIP: a zoomed, counter-tilted crop of the exact UI element the caption
  claims (the $2,339 revenue card, the Printer Error alert, and so on). One
  claim, one zoomed proof, every frame.
- Light wash on all feature frames (the dark app icon sits directly above
  the gallery). Ink appears twice: cover and closer.
- Closer: ink background, headline, boothiq.com, two phones fanned.

**Why minimal wins:** in search results the image is ~200 px tall. One short
bold line + one obvious screen beats any collage.

## 3. Who we are converting (write for one person)

The installer is a photo booth business owner-operator, 25 to 50, running
1 to 15 booths at weddings, corporate events, malls, and arcades. They are
away from the booth while it earns. Their system today is texting the
attendant and hoping. Top anxieties, in order:

1. **"Is the booth working right now?"** Downtime at a paid event is the
   nightmare. Status and alerts kill this fear.
2. **"Did it make money today?"** Revenue per booth, per day, without
   driving there.
3. **"Will I find out too late?"** Paper out, printer error, gone offline
   mid-event.
4. **"How is the season trending?"** Monthly/yearly view for planning.
5. **Looking professional at events.** Fresh templates per event.

Copy consequences: lead every caption with the anxiety it kills, speak
operator vocabulary (booth, fleet, takings, event), never corporate-speak.

## 4. Patterns replicated from top converters

From the saved Shopify/Square sets and 2026 best-practice guides:

1. **Shot 1 is a claim, not a UI tour** ("The best stores are on Shopify").
   Ours is definitional: what BoothIQ is, in five words.
2. **Benefit verbs, not feature nouns.** "Hear about problems first", never
   "Push notification support".
3. **The money number gets zoomed.** Our calorie card is the revenue card:
   $2,339 with the green ↑84.9% badge, cropped big in a proof chip.
4. **One anxiety per frame.** If a caption serves two ideas it gets split.
5. **First 3 do all the work** (search card + install sheet): claim, live
   dashboard, fleet list.

## 5. The shot list (v4 — matches tools/store-screenshots/shots.mjs)

| # | Capture | Big line | Small line | Layout |
|---|---|---|---|---|
| 1 | `01-dashboard.png` | **Every booth.** / **One app.** | Booths · Alerts · Revenue · Templates | ink cover, framed phone |
| 2 | `01-dashboard.png` | **Know how today is going** | Live revenue across your fleet | full-bleed |
| 3 | `02-booths.png` | **Every booth, at a glance** | Status, today's takings, and controls for each unit | full-bleed |
| 4 | `05-alerts.png` | **Hear about problems first** | Printer errors, low paper, offline booths. On your phone | full-bleed |
| 5 | `03-analytics.png` | **See the season, not just today** | Daily to yearly trends, per booth or combined | full-bleed |
| 6 | `04-store.png` | **Fresh looks for every event** | Browse templates and send them to your booth | full-bleed |
| 7 | `06-settings.png` | **Your business, your brand** | Logo, branding, subscription, and booth licensing | full-bleed + identity patches |
| 8 | `01-dashboard.png` + `02-booths.png` | **Run the fleet right** | boothiq.com | ink closer, two phones fanned |

**Caption grammar:** big line 3 to 6 words, sentence case, no period unless
two sentences; small line under 10 words; no em dashes; no exclamation
marks; possessive framing ("your fleet", "your phone") everywhere.

## 6. Decisions needed

1. **iPad set or `supportsTablet: false`?** Keeping tablet support means a
   2064×2752 set and an iPad-layout review surface. If the iPad layout is
   just a stretched phone UI, consider dropping tablet support for v1.
2. **Booth names in captures.** Current demo names (Galaxy Arcade, Regal
   Cinema Lobby, Kuara Market) read real and credible. "Regal" is a real
   cinema chain; if cautious, rename that booth in demo data.
3. **Closer URL.** boothiq.com in the closer is allowed; drop if you prefer
   the frame pure.

## 7. Recapture list — ALL RESOLVED (final set captured 2026-08-02)

1. ~~Push-alerts banner~~ dismissed permanently (dismissal now persists via
   AsyncStorage, `app/(tabs)/alerts.tsx`).
2. ~~Store empty state~~ templates seeded, ratings visible.
3. ~~"Not activated" badge~~ all six booths online + Subscribed.
4. ~~Red analytics badges~~ prorated comparisons deployed; all periods
   green (+7.5/+5.0/+28.4/+22.0), fleet-wide and booth-scoped.
5. ~~Status-bar drift~~ pinned to 9:41 via `simctl status_bar` overrides.

Remaining known blemish (accepted): the account display name in
`06-settings.png` still reads "Photobooth" — masked by the design-layer
patches (shots.mjs) alongside the email swap.

## 8. Production pipeline (deterministic, in-repo)

```
tools/store-screenshots/
  shots.mjs       # §5 as data: capture, captions, layout fields, VERSION
  template.mjs    # renders one 1284×2778 HTML canvas per shot, tokens from §2
  render.mjs      # playwright-core + installed Chrome, JPEG out
  out/<VERSION>/  # rendered JPEGs per design iteration (gitignored —
                  # regenerable; bump VERSION for a new set)
```

- `node tools/store-screenshots/render.mjs` regenerates the whole set in
  seconds after any recapture. Fonts and captures are inlined as data URIs,
  so the render has no network or file-permission dependencies.
- Status-bar pinning for reshoots:
  `xcrun simctl status_bar booted override --time 9:41 --batteryLevel 100 --cellularBars 4`
- Future: OCR gate (tesseract) that fails the build if a rendered caption
  contains `$`, `%`, "free", "trial", or an earnings verb. Not built yet.

## 9. After launch

- A/B via Product Page Optimization: cover vs live-dashboard as shot 1.
- App Preview video (~20 s: alert arrives → open app → booth back online)
  is the biggest conversion add after screenshots. Same pipeline, later.
