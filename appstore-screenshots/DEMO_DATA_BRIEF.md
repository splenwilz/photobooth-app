# BoothIQ — Demo/Seed Data Brief for Marketing Screenshots

A prompt for the backend: what is wrong with the current demo data, which
screens need it fixed, and exactly what to seed. The target account is the
one the iOS app signs into on the simulator today (`photoboothxdev@gmail.com`)
— or a new dedicated `demo@boothiq.com` account if that is cleaner; the app
side does not care which, but ONE account must satisfy everything below,
because it doubles as the **App Review demo account** (a reviewer must see
populated screens, a working template store, and purchasable products).

Screenshots referenced are in `appstore-screenshots/raw/` (1290×2796,
iPhone 16 Plus sim). The marketing set is built from these captures, so
"looks good" means: believable, internally consistent, mostly green.

---

## 0. Global consistency rules (apply to everything below)

1. **One coherent story across screens.** The same numbers must agree
   everywhere they appear: dashboard "today" == booths-tab "today's
   revenue" == analytics "today". Currently true ($2,339) — keep it true
   after reseeding.
2. **Time-series sanity.** week ≥ today, month ≥ week, year ≥ month, and
   rollups arithmetically consistent with the seeded daily revenue.
3. **Green by default — via prorated comparisons (DECIDED).** The red
   badges (−64.4% week, −86.6% month) were structural: the API compared a
   partial current period against a FULL prior period, which is wrong for
   real users too (every month starts deep red). Fix in the API, not the
   seed: compare period-to-date vs the same elapsed span of the prior
   period — week-to-date vs same days last week (day-of-week aligned),
   month-to-date vs first N days of last month, YTD vs first N days of
   last year, computed in the booth's timezone. Guard zero-prior booths
   with "New"/"—", never ±∞%. With that fix, seed dailies so changes land
   between +4% and +30% green (at most one small tasteful dip). Avoid
   100%, 0%, and >90% swings — they read staged or broken.
4. **No absurd totals.** "30002 total" transactions reads like a load
   test. Target a lifetime total in the 3,000–9,000 range for a 6-booth,
   ~2-year-old business.
5. **All booths activated and online.** "Not activated" badges (Galaxy
   Arcade) undermine every fleet shot. 6/6 online, all activated.
6. **Booth-scoped data must belong to the scoped booth.** Standard
   invariant for the scoped endpoints; nothing currently broken here.

## 1. Fleet shape (the cast of characters)

Six booths, all online, all activated. Suggested roster (rename freely,
but avoid real trademarks — "Regal Cinema Lobby" collides with the Regal
chain; rename to e.g. "Grand Cinema Lobby"):

| Booth | Venue flavor | Today | Mode |
|---|---|---|---|
| Downtown Event Center | corporate/event | $610 | Coin |
| Galaxy Arcade | arcade | $520 | Coin |
| Grand Cinema Lobby | cinema | $415 | Card |
| Kuara Market | mall | $340 | Card |
| Harborview Hotel | hotel/wedding | $265 | Card |
| Sunset Pier | boardwalk | $189 | Coin |

Sum = $2,339 (keeps the number already in captures). Each booth: plausible
address, healthy hardware (printer online, camera healthy), non-zero
sessions today.

## 2. Dashboard, all-booths (`01-dashboard.png` — already good, keep)

- Revenue today $2,339, 312 transactions, avg $7.50 — keep this scale.
- Upsale revenue (Extra Copies $332, Cross-Sell $158) — keep.
- Printers 6/0/0 online/error/offline, payment controllers all healthy.

## 3. Analytics, all-booths (`03-analytics.png` — needs reseed, rule 2+3)

- Today $2,339 (+12%), Week $9,870 (+8%), Month $38,400 (+11%),
  Year $134,538 (+18%) — or any numbers with the same shape.
- Daily-revenue chart: a natural weekly curve (weekdays lower, Fri/Sat
  peak, Sun mid). Current chart has one giant Saturday bar dwarfing six
  stubs — spread it so every bar is visible.
- Revenue Breakdown section (below the fold): seed so base vs upsell split
  is visible if we scroll-capture it later.

## 4. Booths tab (`02-booths.png` — one fix)

- Activate Galaxy Arcade (kill the "Not activated" badge).
- Per-booth "Today" numbers per the §1 table; transactions proportional.

## 5. Template store (`04-store.png` — DONE, seeded)

Templates are seeded and the store captures well (6 templates with real
art and prices). Optional nice-to-haves, only if cheap: a few more
templates so scrolled shots stay full, ratings/review text visible on 2–3
detail pages, and one Owned/Purchased state on the demo account. Template
art must be rights-cleared for store screenshots.

## 6. Transactions (`07-transactions.png` — minor)

- Lifetime total per rule 4 (e.g. "4,812 total", not 30002).
- Keep the item shape (product, booth, template, copies, payment method,
  Paid/Printed) — it reads great. Make template names match §5's catalog.

## 7. Booth-scoped screens (`11/12/13-*-booth.png` — data leak + polish)

With Downtown Event Center selected:

- (Some earlier captures show old booth names next to new ones — the booth
  was renamed mid-session in the app. Not a bug; nothing to fix. Just make
  sure alerts/analytics rows reference booths by their current names.)
- Downtown's scoped numbers: today $610, week $2,580, month $10,080,
  year $35,400, all green single-to-low-double-digit changes.
- Give Downtown its own 2 alerts for the scoped shot: 1 warning ("Paper
  Running Low", 12m ago) + 1 info ("Firmware updated", 2h ago). Critical
  alerts look bad scoped to the hero booth; keep the critical printer
  error on Kuara Market in the all-booths view only.
- Hardware Status: Camera "Healthy", Printer "Online", payment controller
  "Connected". Cash Box: $140.00 (a real number, not $0.00, since the
  card is prominent).

## 8. Settings & account (`06-settings.png` — identity polish)

- Business/account name: "Sunset Booth Co." (or similar), NOT "Photobooth".
  (The account EMAIL is not a backend task — the screenshot pipeline
  retouches it to `demo@boothiq.com` in the design layer; see
  `tools/store-screenshots/shots.mjs` patches.)
- Business logo uploaded (shows in Business Branding row).
- Subscription: **Active, renews Sep 1, 2026** — the current "Subscription
  will not renew" is the churn state and cannot be in a marketing shot.
- Credits balance (`08-credits.png`): seed ~240 credits with a history of
  believable +/- entries (top-ups of +100/+50, usage of -8 to -30). The
  current balance is 0 with a giant red "Clear All History" button — not
  usable until balance is positive.
- Notification preferences (`09-notification-prefs.png`): already fine
  (all toggles on).
- Support (`10-support.png`): optional — 3 tickets (one Resolved "Printer
  jam at Grand Cinema", one In Progress, one Open) would let us show the
  support story instead of an empty state.

## 9. NOT backend work — app bugs found during capture (tracked separately)

Listed so nobody chases them as data issues:

1. Credits history renders "--29 credits" (double minus) — client
   formatting bug.
2. Stat-card value wrapping on 6-figure amounts — already fixed in
   `components/ui/stat-card.tsx`.

## 10. Acceptance checklist (capture-ready when ALL true)

- [x] Store lists templates with art and prices (seeded; ratings/owned
      state optional polish)
- [ ] today ≤ week ≤ month ≤ year everywhere; changes green and modest
- [ ] Dashboard/booths/analytics agree on today's total
- [ ] 6/6 booths online and activated; no "Not activated" badges
- [ ] Booth-scoped screens show only that booth's data
- [ ] Downtown Event Center: 2 non-critical alerts, healthy hardware,
      non-zero cash box
- [ ] Account shows branded business name, logo, active renewing
      subscription, positive credit balance
- [ ] Lifetime transaction count 3,000–9,000
- [ ] (Bonus) 3 seeded support tickets

After the reseed, the app-side capture run is one command per screen
(deep links + `xcrun simctl io booted screenshot`), so we can re-shoot the
whole set in minutes.
