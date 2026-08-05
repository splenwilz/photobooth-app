# Backend Task: Final Demo-Data Fixes for App Store Screenshots

> **STATUS 2026-08-02 (post-capture):** §2 transactions (now 8,410, no
> $0-Paid row) and §3 subscription state ("Renews: Sep 1, 2026") are
> RESOLVED and verified on-device; §4 cash box shows $140 — resolved. The
> screenshot set shipped without the credits screen, so §1 (balance field
> resets to 0, contradicting the ledger's Bal: 240) is no longer a
> screenshot blocker — but it is still a REAL USER-FACING BUG worth fixing:
> maintenance scripts keep zeroing the balance while leaving the ledger
> intact (three recurrences). The §3 account display name ("Photobooth") is
> also still pending; low priority since the design layer patches it. §5's
> reseed regression guard (continuous heartbeats, alert cleanup ordering)
> remains standing policy for the demo environment — it doubles as the App
> Review demo login.

> Paste this whole document as the prompt for the backend repo (branch
> `feat/demo-seed-screenshots`). It is self-contained: every remaining
> issue with the observed wrong value, the expected value, where the app
> surfaces it, and an acceptance checklist. Everything else from the
> earlier demo-data brief has landed and verified on-device — analytics
> rollups, prorated green change badges, booth heartbeats/activation,
> template store, alert cleanup. This is the tail.

**Account:** `photoboothxdev@gmail.com` (seeded with `--tz Africa/Lagos`).
This account doubles as the **App Review demo login**, so these are not
cosmetic-only: a reviewer sees exactly these screens.

**Frontend status (context, no action):** the mobile app now sends
`?tz=<IANA zone>` on all five endpoints it uses — `/analytics/revenue/
dashboard`, `/analytics/revenue/{booth_id}`, `/booths/overview`,
`/booths/overview/all`, `/booths/{booth_id}/overview` — with tz-keyed
caches and foreground refetch on zone change. Note the app does NOT call
`/analytics/summary` or `/analytics/revenue?period=` at all, so don't
block anything on those two for mobile.

---

## 1. Credits balance contradicts its own ledger (bug, not seed)

**Observed** (Credit History, Downtown Event Center): header card says
**"Current Balance: 0 credits"** while the newest ledger row directly
below it says **"+50 credits · Bal: 240"**. The running balances in the
seeded rows are correct and consistent (…117 → 217 → 190 → 240); only the
balance field the header reads is wrong.

**Expected:** the balance the API returns equals the running balance of
the newest ledger entry — **240** with the current seed. Whether that
means the seeder forgot to update a `balance` column or the endpoint
computes balance from a different source than the ledger, make the two
agree — this would be a real-user bug too (operator sees 0, ledger says
240).

## 2. Transactions lifetime total is implausible

**Observed** (All Transactions header): **"108518 total"**. A 6-booth,
~2-year business at ~$7.50/transaction doing $325k lifetime is ~40k
transactions at most; six figures reads like a load test in a store
screenshot.

**Expected:** lifetime total between **3,000 and 9,000**, arithmetically
compatible with the seeded year revenue if feasible (e.g. ~$325k/yr at
$7.50 avg doesn't have to reconcile perfectly across years — just keep
the total in the 4-digit range). Only the count needs to change; the
individual seeded transaction cards are perfect (product, booth,
template names from the store catalog, Paid/Printed).

**Minor, same screen:** the newest entry is `PhotoStrips · $0.00 ·
Payment: Free` yet badged **"Paid"**. Either give free sessions a
non-"Paid" status (or no payment badge), or don't seed $0/Free items at
the top of the list.

## 3. Demo account identity (Settings screen)

**Observed:** account card shows name **"Photobooth"**; subscription card
shows **"Active · Expires: Sep 1, 2026 · Subscription will not renew"**.

**Expected:**
- Business/account display name: a believable operator brand — suggest
  **"Sunset Booth Co."** (any tasteful name works; avoid real trademarks).
- Subscription in the **renewing** state: auto-renew on / no
  cancel-at-period-end, so the card reads "Renews Sep 1, 2026" (or
  equivalent) instead of the churn message. A marketing screenshot and an
  App Review demo login cannot show a subscription that is lapsing.
- Do NOT change the login email — the screenshot pipeline retouches the
  displayed email in the design layer; changing credentials would break
  the sign-in we hand to App Review.
- Bonus if cheap: a business logo on the account so the Business Branding
  row shows it.

## 4. Cash Box amount (optional polish)

**Observed** (Downtown Event Center dashboard): **Cash Box $0.00** on a
booth that did $610 today in Coin mode — internally inconsistent.

**Expected:** a believable amount, e.g. **$140.00**. Low priority but the
card is prominent on the booth dashboard shot.

## 5. Rule for any future reseed (regression guard)

The previous reseed knocked booths offline mid-run, which auto-generated
**6 "Booth Offline — lost connection" critical alerts** and polluted the
alerts screens until they were manually cleared. If you reseed again:

- Seed heartbeats as continuous/current so no connectivity gap occurs, or
  suppress alert generation during seeding, or clear generated alerts as
  the final seed step.
- Preserve the curated alert mix afterwards: **1 critical (Printer
  Error, Kuara Market), 1–2 warnings (Paper Running Low ~13%), 1 info**,
  with fresh timestamps ("just now" / minutes ago) — this is the alerts
  screenshot.
- Keep the invariants that now hold: today ≤ week ≤ month ≤ year, green
  prorated badges, 6/6 booths online and activated, store catalog with
  ratings.

## Acceptance checklist (verified in the iOS app)

- [ ] Credit History header balance equals the newest ledger row's
      running balance (240 with current seed)
- [ ] All Transactions total is 3,000–9,000
- [ ] No $0 "Free" transaction badged "Paid" at the top of the list
- [ ] Settings shows a branded business name (not "Photobooth")
- [ ] Subscription card shows an active, renewing state (no "will not
      renew")
- [ ] Login email unchanged (`photoboothxdev@gmail.com`)
- [ ] Downtown Event Center cash box shows a non-zero believable amount
- [ ] Alerts screens still show the curated mix (no "Booth Offline"
      artifacts); all 6 booths online
- [ ] Dashboard/analytics/booths numbers unchanged: today $2,339 +7.5%,
      Downtown $610 +7.2%, year $325,043 +22.0%
