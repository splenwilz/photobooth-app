# Notification Channel Policy (Decided)

**Status:** Decided — 2026-07-07. This is the policy to implement, not a proposal.

## The rule

1. **Push is system-controlled, NOT a user choice.** We (the backend) decide which events
   push; the user's only push control is the OS-level switch (Settings → BoothIQ). We push the
   events worth interrupting for and **skip the pure confirmations** so nobody is annoyed into
   muting everything at the OS level (which would also kill the critical alerts).
2. **Email is the only user choice.** It is OFFERED for record-worthy events only — license,
   subscription/billing, and money-movement — where email is ON by default and the user may
   turn it **off**.
3. **Email is NOT OFFERED for operational events** — booth and hardware alerts. There is no
   email for these and the user **cannot** enable it.

Why push isn't a toggle: push *is* the product for an operational tool, and the OS already
gives the real off-switch, so per-event push toggles are redundant. Why email is: email has a
cost (SendGrid 50k/month quota) and an inbox-clutter question push doesn't. Operational alerts
are high-frequency and worthless as a saved record — pushing them and never emailing them keeps
email volume low; record-worthy events keep an email trail because users search/forward/reconcile
them later.

## Per-event policy (all 16 events)

Push column = does the system send a push (not user-toggleable). Email column = user
preference where offered.

| Event | Category | Push (auto) | Email (user) |
|---|---|:---:|:---:|
| license_expiry_warning | License | Yes | ON |
| license_deactivated | License | Yes | ON |
| license_revoked | License | Yes | ON |
| license_activated | License | **No** (confirmation) | ON |
| payment_failed | Billing | Yes | ON |
| subscription_cancelled | Billing | Yes | ON |
| subscription_created | Billing | **No** (confirmation) | ON |
| subscription_renewed | Billing | **No** (confirmation) | ON |
| stranded_paid_session | Money-movement | Yes | planned† |
| payment_result_invalid | Money-movement | Yes | planned† |
| booth_offline | Booth | Yes | — not offered |
| booth_unregistered | Booth | Yes | — not offered |
| printer_error | Hardware | Yes | — not offered |
| supply_critical | Hardware | Yes | — not offered |
| pcb_error | Hardware | Yes | — not offered |
| booth_registered | Booth | **No** (confirmation) | — not offered → **silent** |

**Push on 12 events, off on the 4 confirmations. Email: 8 user-configurable today · 6
push-only · 2 money-movement email-planned.** "ON" = email default on, user can turn off.
"— not offered" = no email at all, user cannot enable it. `booth_registered` produces neither
push nor email (in-app feed only). **†** the two money-movement events are **push-only until
their email templates ship** — email is intended (per backend As-Built §6).

## How it's enforced (backend)

**Push is not a user preference at all.** The preferences endpoint manages **email only** —
`offered` never contains `push`, there is no push toggle, and the app renders none. Whether an
event pushes is a **producer decision** (the Push column above): the send path pushes the 12
and never produces a push for the 4 confirmations. The user's only push control is the OS.

**Email availability is enforced server-side** (hiding a toggle in the app isn't enough — a
crafted request can't add email we don't offer):

1. **`GET /preferences`** returns only email-configurable events (the 8), each with its email
   state; operational/push-only events don't appear.
2. **`PATCH /preferences`** with email on a non-offered event → **400** (never writes the row).
3. **Send path** never emails an operational event regardless of any stored row — the
   offered-channel list is the source of truth, checked before every send.

`payment_failed` email should follow a dunning cadence (day 0/3/7/14), not a single send.
Email-sending events require SPF/DKIM/DMARC + a dedicated subdomain (Gmail/Yahoo bulk rules).

See `push-notifications-backend-contract.md` §3 (API + gating) and §5 (defaults) for the
implementation details.

## Push permission (client — implemented)

The app asks proactively, not via a passive toggle: nothing at signup; after the operator
connects their **first booth**, a priming screen offers **Enable alerts** (fires the one OS
prompt) or **Not now** (iOS quiet provisional / Android dismiss). If notifications are off, the
Alerts screen shows a banner that deep-links to OS Settings.
