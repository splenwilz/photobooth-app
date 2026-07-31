# Per-Booth Subscription Management — Gap Analysis & Backend Requests

**Status:** three different things, deliberately not collapsed into one word.

| | State |
|---|---|
| **Backend availability** | DONE — every P0 endpoint shipped in the second release, all six verification questions answered. |
| **Client enablement** | DONE — the app is migrated onto them and the work is in review. |
| **Production approval** | **NOT DONE** — see release blockers below. Nothing here is cleared to ship. |

This document is kept as the record of what was asked and why. It is NOT a live
to-do list, and several statements below were overtaken by events — see
**Outcome** immediately after this header.

## Outcome

Delivered by the backend: `POST /booths/{id}/subscription/portal`,
`GET /booths/{id}/subscription/state`, `POST /booths/{id}/subscription/resume`,
`activation_required` on the fleet list, a `return_url` host allowlist, startup
verification of the restricted portal configuration, and `actor_user_id` on
owner-initiated `billing` log entries.

Corrections to this document, established after it was written:

- **§3's ship gate is NOT satisfied.** The backfill found nothing to pin, but in
  TEST MODE only, which says nothing about production. Card update is *built and
  enabled in the client*; it is not approved for production. The generic
  "Update payment card" copy stays until a live-mode dry run confirms per-booth
  isolation, and the wording must not imply per-booth scope before then.
- **§7's client fixes were superseded.** `refetchOnMount: "always"` and a 404
  retry guard were NOT added. The 404 endpoint was removed outright instead, and
  staleness is handled by wiring `focusManager` to `AppState` plus an explicit
  refresh-on-focus hook.
- **§2.1's stated return host was wrong.** `app.boothiq.com` does not exist; the
  dashboard is `boothiq.com/dashboard/...`. The app sends `WEBSITE_URL`-derived
  URLs, and allowlist matching is downward-only (an apex entry covers
  subdomains, not vice versa).
- **§2.4's "one client type" did not happen.** `BoothSubscriptionStateResponse`
  and `BoothSubscriptionItem` remain distinct, matching the backend's own
  schemas.
- **The reported stale-read after cancel was NOT webhook lag.** Both handlers
  write synchronously; FastAPI commits during dependency teardown, after the
  response is written, so an immediate refetch can beat the commit.

### Release blockers

These gate production, not this change set. Items 1–3 must be closed before the
card-update flow is enabled for real customers.

1. **Live-mode backfill dry run.** Until this is clean, per-booth card isolation
   is unverified and the copy must stay generic. Establish first whether
   production runs test keys at all, which would make the check moot.
2. **`payment_method_update` verified against LIVE Stripe keys.** Confirmed
   enabled in test mode only; a disabled live configuration returns
   `409 flow_not_available` for every user.
3. **Production `WEBSITE_URL` / `PORTAL_RETURN_URL_ALLOWED_HOSTS`.** Allowlist
   matching is downward-only — an apex entry covers subdomains, not the reverse
   — so confirm the host the app actually sends is covered.

### Development only

4. A dev allowlist entry so portal calls work against a tunnel. Prefer the
   **exact tunnel hostname**; `ngrok-free.app` is a shared public suffix, so
   allowing it trusts return URLs on anyone's tunnel. If the suffix is used for
   convenience while hosts rotate, the configuration should reject shared tunnel
   domains outright in production rather than relying on them being unset —
   apex-to-subdomain matching for real hosts is unaffected either way.

---

**Original request follows, unedited.**

**Status:** Requested. Response to *Booth Self-Service Billing — Integration Notes for Web & Mobile* (2026-07-30).
**Author:** BoothIQ mobile app (this repo).
**Scope:** what the app needs in order to let an owner manage **any** booth's subscription from the app, plus security findings in the shipped booth-facing flow.

Every claim attributed to the backend below is quoted from the Integration Notes. Items we
could not verify without backend source are filed as **questions**, not defects, and marked
`NEEDS VERIFICATION`.

---

## 0. Summary

**The original request** was: an owner with several booths cannot sanely manage subscriptions
through Stripe's hosted portal on the web, so let them do it **per booth, in the app** — view
status, update card, cancel, resume, change plan.

**What shipped** was a booth-facing (kiosk) flow authenticated with `X-Booth-API-Key`, and a
document whose own TL;DR reads:

> *"nothing you call today has changed … No migration is required and no deploy of your app is
> needed for the backend release."*

That is the problem statement, not the reassurance it was intended as. The three per-booth
endpoints the app can use (`GET …/subscription`, `POST …/subscription/checkout`,
`POST …/subscription/cancel`) are described in the same document as endpoints that
*"already exist and have always been JWT-authenticated."* So the release delivered **zero net
app-facing capability** against the request.

The mechanism that would deliver it **was built** — Stripe `flow_data` deep links, scoped to one
action on one subscription — and exposed only to the booth API key. The Integration Notes state:

> *"There is currently no JWT-authenticated endpoint that returns one. It is a small addition
> (the service layer already builds the `flow_data`), but it does not exist yet — do not code
> against it."*

This document asks for that addition (§2), flags a blocking data defect (§3), and raises ten
security findings in the shipped kiosk flow (§4).

### Note on the kiosk flow's premise

The kiosk flow terminates in *a human confirming in Stripe's UI on their phone* — reached by
scanning a QR shown on the booth. Since the phone is already in the operator's hand, and the app
already knows which booth is meant (it has `booth_id`), the kiosk step adds a screen, an admin
password entry, and a hard network dependency on the booth to arrive at a page the app could
open directly. The stated justification —

> *"you enter from a specific machine, so the subscription being managed is unambiguous"*

— is satisfied equally by an authenticated app request carrying `booth_id`. Disambiguation was
never the hard part; it does not require a kiosk.

The consequence is §4: the flow's one distinctive contribution is converting a
properly-authenticated billing action into an **anonymous bearer credential rendered on a screen
in a public venue**. §4.1 and §4.2 follow directly from that, using only facts stated in the
Integration Notes.

---

## 1. The requirement, restated as a capability matrix

What an owner needs, per booth, from the app:

| Per-booth action | JWT endpoint today | Gap |
|---|---|---|
| View one booth's subscription | ✅ `GET /booths/{id}/subscription` | 404-on-empty (§2.4) |
| List all booths + subscriptions | ✅ `GET /payments/booths/subscriptions` | no activation state (§2.5) |
| Subscribe a booth | ✅ `POST /booths/{id}/subscription/checkout` | — |
| Cancel at period end | ✅ `POST /booths/{id}/subscription/cancel` | — |
| **Update the card for that booth** | ❌ | §2.1 + §3 (**blocked**) |
| **Undo a scheduled cancellation** | ❌ | §2.2 |
| **Change plan / monthly↔annual** | ❌ | §2.3 |
| **That booth's invoices & receipts** | ❌ | §2.3 |

The four missing rows are exactly the ones that require a subscription-scoped Stripe session.
Today each one forces the app to fall back to `POST /api/v1/payments/portal`, which is
customer-scoped and lands the user on the portal homepage — the *"six indistinguishable rows"*
problem the Integration Notes open by describing. The app currently makes this call from a
per-booth context (`components/subscription/SubscriptionDetailsModal.tsx`), which we will not
ship to users in that form.

---

## 2. Requested endpoints

### 2.1 The unblocker — per-booth scoped portal session (**P0**)

A JWT-authenticated sibling of the booth-facing mint. Uses the same `flow_data` the service
layer already builds.

```text
POST /api/v1/booths/{booth_id}/subscription/portal
  auth:   WorkOS JWT (Bearer) + ownership check on booth_id
  body:   {
            "flow": "payment_method_update" | "subscription_cancel" | "subscription_update",
            "return_url": "<absolute https URL>"
          }
  200:    { "success": true, "portal_url": "https://billing.stripe.com/p/session/..." }
  400:    unknown "flow" value
  403:    booth_id not owned by caller
  404:    booth has no subscription to scope a session to
  422:    return_url not on the server-side allowlist
  503:    portal configuration unavailable
```

Requirements:

1. **Use the Dashboard default configuration, not the restricted `bpc_…` one.** Per the
   Integration Notes, the restricted config exists because a booth API key is weak; our users
   authenticate properly. The `flow_data` parameter — not a crippled configuration — is what
   scopes the session to one action on one subscription.
2. **`return_url` must be validated against a server-side allowlist, not forwarded verbatim.**
   See §4.8. The app will send an `https://app.boothiq.com/…` URL.
3. **The `flow` value must be applied to the specific `subscription_id` for `booth_id`**, resolved
   server-side. The app must not need to send a `subscription_id`.
4. Log to the `billing` event type on the same terms as the booth flow (action, outcome,
   `subscription_id`; never the URL), with the actor recorded as the authenticated user — see
   §4.2 on why actor attribution matters.

### 2.2 Resume / undo a scheduled cancellation (**P0**)

Cancellation is period-end only, so between the cancel and the period end there is a window in
which the correct user action is "never mind." There is no JWT endpoint for it, and the
Integration Notes indicate no booth-facing one either (*"There is no booth-facing endpoint that
cancels, resumes, or moves money"*). Today the only path is the generic portal.

This matters more now that a cancellation can be initiated at the kiosk without the owner's
involvement (Integration Notes §1) — and, per §4.2, potentially without the owner's *knowledge*.

```text
POST /api/v1/booths/{booth_id}/subscription/resume
  auth:   WorkOS JWT + ownership check
  body:   {}
  200:    { "subscription_id": "sub_…", "status": "active",
            "cancel_at_period_end": false, "current_period_end": "<ISO 8601>" }
  404:    booth has no subscription
  409:    period already elapsed — nothing to resume (client falls back to checkout)
```

`409` rather than an error string, so the app can route the user straight to re-subscribe.

### 2.3 Plan change and per-booth invoices (**P2**)

Both are acceptable via §2.1 (`flow: "subscription_update"`, and the portal's invoice list) for a
first pass. A native `POST /booths/{id}/subscription/change-plan` taking a `price_id` would be
preferable later so the app can render its own plan picker, but it is not blocking.

### 2.4 A `200`-always read for one booth (**P1**)

`GET /booths/{booth_id}/subscription` returns `404` when there is no subscription. We accept the
reasoning for not mutating it:

> *"doing so would silently alter what every existing consumer sees."*

But the asymmetry it creates is the issue — the booth-facing endpoint returns `200` with
`state: "none"` *"because a kiosk screen has to render something."* Our screens have the same
requirement: we render a subscription card for **every** booth, including unsubscribed ones. The
result is that the app currently models "no subscription" as a fetch failure. It renders
correctly only because `SubscriptionStatusCard` ignores `error` and falls through on `undefined`
data — correct by accident, and fragile.

Taking up the offer of a sibling path:

```text
GET /api/v1/booths/{booth_id}/subscription/state
  auth:   WorkOS JWT + ownership check
  200 (always, for any owned booth):
          {
            "booth_id": "…",
            "booth_name": "…",
            "state": "none" | "active" | "trialing" | "past_due" | "canceled" | "unpaid",
            "subscription_id": string | null,
            "status": string | null,
            "is_active": boolean,
            "current_period_end": string | null,
            "cancel_at_period_end": boolean,
            "price_id": string | null,
            "activation_required": boolean        // see §2.5
          }
  403:    booth_id not owned by caller
  404:    booth_id does not exist
```

The existing `404` endpoint stays exactly as it is. Field names match
`BoothSubscriptionItem` in `api/payments/types.ts` so both reads share one client type.

### 2.5 Surface `activation_required` on owner endpoints (**P1**)

Taking up the offer in Integration Notes §4. Today:

> *"There is no new field on your endpoints for this today — `Booth.hardware_id` being null is
> the signal."*

We do not receive `hardware_id`, so we cannot compute it. The consequence is that our fleet view
shows a booth as healthy and paid when it *"looks 'paid' in billing terms but will not run."*
Please add `activation_required: boolean` to both `GET /payments/booths/subscriptions` items and
the §2.4 response. A boolean is preferable to exposing `hardware_id` itself — we have no use for
the identifier and would rather not hold it.

---

## 3. Blocking defect: `default_payment_method` is customer-scoped

From the Integration Notes' own "Known limitation":

> *"Stripe's `payment_method_update` flow is customer-scoped: it sets
> `customer.invoice_settings.default_payment_method`. With several booths under one Stripe
> customer, any booth without its own subscription-level default will also start using the new
> card."*

The proposed mitigation is honest labelling — the kiosk button says *"Update payment card"*
rather than *"Update this booth's card."*

**Copy is not a fix, and this is the one requirement the whole feature was built for.** A
multi-booth owner is precisely the user in the original request. Shipping a per-booth card update
that silently changes other booths' cards reproduces the confusion we set out to remove, in a
surface where users will trust it *more* because it is inside the app and scoped to a named
booth.

It is also a security finding, not only a UX one — see §4.1.

**Ask.** Pin each subscription's own `default_payment_method`:

- at provisioning time for new subscriptions, as already planned; **and**
- as a **backfill** across existing subscriptions — new-only leaves every current customer exposed.

**Sequencing:** no per-booth card-update UI ships anywhere — app *or* kiosk — until the backfill
has run. We will hold §2.1's `payment_method_update` flow behind that. `subscription_cancel` and
`subscription_update` are unaffected and can ship first; cancellation, as the Notes say,
*"genuinely is per-subscription."*

---

## 4. Security findings in the shipped booth-facing flow

Derived from the Integration Notes only. §4.1–4.3 follow from statements in that document;
§4.4–4.10 are questions we cannot answer without backend source.

| # | Finding | Severity | Status |
|---|---|---|---|
| 4.1 | Photographed QR → fleet-wide payment-method takeover | **Critical** | Confirmed by doc text |
| 4.2 | Cancellation sabotage with non-attributive audit trail | **High** | Confirmed by doc text |
| 4.3 | Booth API key is long-lived and distributed by QR | **High** | Partly confirmed |
| 4.4 | Are the kiosk gates enforced server-side? | **High if client-side** | `NEEDS VERIFICATION` |
| 4.5 | Minted session TTL / revocation unspecified | Medium | `NEEDS VERIFICATION` |
| 4.6 | No rate limit described on session minting | Medium | `NEEDS VERIFICATION` |
| 4.7 | Fail-closed covers *unset*, not *misconfigured* | Medium | `NEEDS VERIFICATION` |
| 4.8 | `return_url` forwarded verbatim | Low now, High for §2.1 | Confirmed by doc text |
| 4.9 | Ownership-check coverage on the plural tree | Verify | `NEEDS VERIFICATION` |
| 4.10 | Webhook signature / replay protection | Verify | `NEEDS VERIFICATION` |

### 4.1 Photographed QR → fleet-wide payment-method takeover (Critical)

The QR encodes a Stripe portal session URL. Per the Notes, *"The Stripe session URL is never
recorded — it is a bearer credential."* It requires no further authentication; that is the point
of the flow.

So the precondition for abuse is not possession of the booth API key. It is **a few seconds of
line of sight to a kiosk display** in a bar, wedding venue, mall, or lobby.

Chained with §3, the impact is not limited to the booth that displayed it: because
`payment_method_update` writes the **customer's** default payment method, someone who scans one
booth's QR can replace the default card for **every booth under that Stripe customer** lacking a
subscription-level default. A card chosen to decline sends the whole fleet to `past_due` at next
renewal.

The kiosk-side gates the Notes describe — Master admin access, re-entered admin password,
matching hardware fingerprint — all protect the **minting** of the session. None protects the
**artifact**. Once the QR is rendered, every gate is upstream of the attacker.

**Ask.** Ship §3's backfill; keep `payment_method_update` disabled on the kiosk until it lands;
then apply §4.5 (short TTL, single-use, invalidate on screen exit). Longer term, prefer §2.1 —
an authenticated app request needs no on-screen bearer credential at all.

### 4.2 Cancellation sabotage with a non-attributive audit trail (High)

A cancel-at-period-end triggered from a photographed QR produces no immediate outage, so nothing
looks wrong. It surfaces as an email the owner may ignore, plus a `billing` log entry. The Notes
state what that entry is worth:

> *"a `billing` log entry tells you a booth opened the page, but the confirmation happened on
> someone's phone in Stripe's UI."*

The log therefore cannot distinguish the owner from a stranger who walked past the display. Weeks
later the booth stops with no attributable cause — the audit trail goes blind at exactly the
moment it is needed, and support has nothing to work with.

**Ask.** (a) Record on the `billing` entry whatever identity Stripe returns on the resulting
webhook, so `minted` can be correlated with *who confirmed*. (b) Notify the account owner on
`minted` for `subscription_cancel`, not only on the completed transition — a session was opened
against their billing, which is worth knowing even if nobody confirms. (c) For §2.1, record the
authenticated user ID as actor.

### 4.3 The booth API key is long-lived and distributed by QR (High)

Per the Notes, the key is *"plaintext on a kiosk in a venue, and embedded in the provisioning QR
shown at setup."* The document argues:

> *"a booth API key cannot change billing state. There is no booth-facing endpoint that cancels,
> resumes, or moves money."*

Strictly true, and of limited defensive value: the key mints an unlimited supply of URLs that
can. Nothing in the document describes rotation, expiry, or revocation.

**Questions.** Is the key rotatable without re-provisioning? Is it revoked when a booth is
unlinked or deleted? Does it expire? Is the provisioning QR single-use and short-lived?

### 4.4 Are the kiosk gates enforced server-side? (`NEEDS VERIFICATION`)

The Notes say:

> *"On the kiosk side the action additionally requires Master admin access, a re-entered admin
> password, and a matching hardware fingerprint."*

"On the kiosk side" reads as local enforcement. **If `POST /booth/billing/portal/*` accepts a
bare `X-Booth-API-Key`, all three gates are bypassable remotely and repeatably with `curl` by
anyone holding a key** — which §4.3 says is printed in venues.

**This is the first question to answer**; it determines whether §4.3 is a hygiene issue or a
critical one. Please confirm, per endpoint, which checks the *server* performs — specifically
whether the hardware fingerprint is verified against stored booth state on the mint call.

If these turn out to be client-side only, our recommendation is to disable the kiosk billing
screen rather than harden it: by §0's reasoning it is not buying capability that the app path
would not provide more safely.

### 4.5 Minted session TTL and revocation (`NEEDS VERIFICATION`)

Nothing states how long a minted URL is valid, whether it is single-use, or whether leaving the
admin screen invalidates it. If a session outlives the return to the attract loop, a photograph
taken an hour earlier still works.

**Ask.** Shortest workable TTL; single-use if Stripe permits; server-side invalidation when the
kiosk admin session ends or times out.

### 4.6 Rate limiting on minting (`NEEDS VERIFICATION`)

The `outcome: "refused:<code>"` field shows refusal logic exists, but throttling is not mentioned.
Unbounded minting means an unbounded population of live bearer URLs per booth.

**Ask.** Per-booth and per-key rate limits on both mint endpoints, with refusals logged.

### 4.7 Fail-closed covers *unset*, not *misconfigured* (`NEEDS VERIFICATION`)

Good as far as it goes:

> *"If it is unset, the booth endpoints return `503` rather than falling back to an unrestricted
> session — deliberately fail-closed."*

But the Notes also warn that a `bpc_…` ID *"belongs to one Stripe mode,"* so test and live differ.
A value that is *wrong* rather than *absent* — the other mode's ID, or the Dashboard default
config's ID — appears to be accepted. That silently mints **unrestricted** kiosk sessions:
invoice history, customer details, plan switching.

**Ask.** Assert at startup that `STRIPE_BOOTH_PORTAL_CONFIG_ID` resolves to a live configuration
in the current Stripe mode whose capabilities match the restricted set; fail closed otherwise.

### 4.8 `return_url` forwarded verbatim

The Notes state the backend forwards our `return_url` verbatim to Stripe (*"the backend forwards
it verbatim"*). Low severity today — a JWT holder can only redirect themselves, and the booth
endpoints correctly accept no `return_url` at all.

It becomes an open-redirect-from-a-trusted-Stripe-page primitive the moment §2.1 exists.

**Ask.** Server-side allowlist of return hosts/paths, specified **before** §2.1 is implemented;
`422` on anything else. Applies to `POST /payments/portal` too.

### 4.9 Ownership-check coverage (`NEEDS VERIFICATION`)

The Notes assert `/booths/{booth_id}/…` is *"WorkOS JWT + ownership check."* Please confirm it is
enforced on **every** billing route in that tree, including §2.1 and §2.2 once added. An IDOR on
`booth_id` would let any authenticated user cancel any other customer's booth. Cheap to cover
with a test; severe to miss.

### 4.10 Webhook integrity (`NEEDS VERIFICATION`)

The entire cancellation path depends on `customer.subscription.updated`. Please confirm Stripe
signature verification, and replay/idempotency protection keyed on event ID. The 30-minute
`EmailNotificationLog` cooldown cited in the Notes dedupes **emails**, not state transitions.

---

## 5. Priority

| Priority | Item | Rationale |
|---|---|---|
| **P0** | §4.4 answer | Decides the severity of §4.3 and whether kiosk billing stays enabled |
| **P0** | §3 subscription-level default + **backfill** | Blocks all per-booth card UI, app and kiosk |
| **P0** | §2.1 portal endpoint (cancel + update flows) | Unblocks the original request |
| **P0** | §2.2 resume | Cancellations can now originate outside the app; no undo exists |
| **P1** | §4.1 / §4.2 / §4.5 / §4.6 / §4.7 hardening | Live exposure in production venues |
| **P1** | §2.4 `200`-always read, §2.5 `activation_required` | Removes an accidental-correctness dependency; fixes a misleading fleet view |
| **P1** | §4.8 `return_url` allowlist | Must be settled before §2.1 is written |
| **P2** | §4.9 / §4.10 verification | Likely already correct; confirm with tests |
| **P2** | §2.3 native plan change | Portal flow is an acceptable first pass |

---

## 6. Definition of done (app wiring)

The app can replace its per-booth use of `POST /payments/portal` once:

1. `POST /booths/{booth_id}/subscription/portal` returns a `flow_data`-scoped session for
   `subscription_cancel` and `subscription_update`, with an allowlisted `return_url`.
2. `POST /booths/{booth_id}/subscription/resume` clears `cancel_at_period_end`.
3. §3's backfill has run — at which point we enable the `payment_method_update` flow **and**
   describe it as per-booth in our copy, which we cannot honestly do today.
4. `GET /booths/{booth_id}/subscription/state` returns `200` with `state` and
   `activation_required`.

`POST /payments/portal` stays exactly where it is for account-level billing — invoice history and
the whole-account view. That part of the Integration Notes we agree with.

---

## 7. What the app is fixing on its own side

Not backend work; listed so the boundary is clear.

- **Stale subscription state.** `useBoothSubscription` uses a 5-minute `staleTime` with the global
  `refetchOnMount: true` (refetch only when stale), so a cancellation made at a kiosk can read as
  "Active" in the app for up to five minutes. Moving the per-booth reads to
  `refetchOnMount: "always"`, per Integration Notes §1.
- **404 handling.** Adding an explicit no-retry-on-404 guard to `useBoothSubscription`, matching
  `useSubscriptionDetails`, and handling "no subscription" as a state rather than an error —
  independent of whether §2.4 lands.
- **Unknown `event_type` values.** No effect here: the app has no log *viewer*. It only calls
  `POST /booths/{booth_id}/download-logs` for a presigned archive, so the new `billing` type and
  the widened filter allowlist need no client change.

---

## 8. Sources

- *Booth Self-Service Billing — Integration Notes for Web & Mobile*, backend team, 2026-07-30 —
  every quotation above.
- Stripe Billing customer portal: session `flow_data`, portal configurations, and
  `invoice_settings.default_payment_method` scope.
- App-side references: `api/payments/services.ts`, `api/payments/queries.ts`,
  `api/payments/types.ts`, `components/subscription/SubscriptionDetailsModal.tsx`,
  `components/subscription/SubscriptionStatusCard.tsx`.
