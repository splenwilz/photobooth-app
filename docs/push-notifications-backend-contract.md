# Push Notifications & Alert Read-State — Backend Contract

**Status:** Proposed. Backend to implement; client (BoothIQ app) wires up once these land.
**Last verified against official docs:** July 2026 (see [Sources](#sources)).

This document specifies exactly what the BoothIQ backend (FastAPI REST service) must
provide so the app can (1) make alert **read-state** work and (2) deliver alerts as
**push notifications**. Every design choice here is backed by current official
documentation, not the existing codebase — where a recommendation diverges from what
we already have, it's called out under **⚠ Divergence**.

---

## 0. Architecture at a glance

```
 App (Expo SDK 54)                Backend (FastAPI)                 Expo Push Service
 ─────────────────                ─────────────────                 ─────────────────
 mint ExpoPushToken  ──register──►  push_devices table
 (getExpoPushTokenAsync)            notification_preferences
                                    on event:
                                      resolve prefs + defaults
                                      fetch active tokens        ──►  POST exp.host/.../send
                                                                 ◄──  tickets
                                      ~15 min later (cron)       ──►  POST .../getReceipts
                                      prune DeviceNotRegistered  ◄──  receipts
```

**Key architectural fact:** APNs (`.p8`) and FCM **v1** (service-account JSON) credentials
live in **EAS/Expo**, *not* in the backend. The backend never calls Apple or Google
directly — it only calls `exp.host`. This removes all APNs-JWT / FCM-OAuth handling from
your scope. (Source: Expo *Sending notifications* + *FCM credentials*.)

**Division of labor**

| Concern | Owner |
|---|---|
| Mint Expo push token, ask OS permission, handle taps/deep-links, local read-state | **App (client)** |
| Store tokens + preferences, send via Expo, check receipts, prune, decide who gets what | **Backend (this doc)** |
| APNs key, FCM v1 service account, Expo access token | **EAS/Expo project config** |

---

## 1. Alert read-state (make "read" work)

Today the alerts feed returns `is_read` but nothing can flip it (`app/(tabs)/alerts.tsx`
has a `// TODO` where mark-as-read should be). The client will ship **local-first**
read-state immediately; these endpoints let it become server-backed (cross-device,
server-computed unread badge).

```
PATCH /api/v1/analytics/alerts/{alert_id}/read
  auth:   required (Bearer)
  body:   { "is_read": true }
  200:    { "id": "<alert_id>", "is_read": true }
  404:    unknown alert_id

PATCH /api/v1/analytics/alerts/read-all
  auth:   required
  body:   { "booth_id": "<id>" | null }        # null = all booths for this user
  200:    { "updated": 12 }
```

**Requirements on the existing `GET /api/v1/analytics/alerts[/{booth_id}]`:**
- Each alert `id` must be **stable across refetches** — the client keys both local
  read-merge and the mutation on it.
- Please confirm: is `is_read` currently always `false` (no producer), or is it already
  meaningful? This decides whether the client's local store is the sole source of truth
  until the PATCH endpoints exist.

---

## 2. Push device-token registration

The client mints an Expo push token (`ExponentPushToken[...]`) and registers it per
install. Store one row per **`(user_id, device_id)`** — see the divergence note.

```
POST /api/v1/push/devices
  auth:   required (Bearer) — user_id derived from the token, NEVER from the body
  body: {
    "expo_push_token": "ExponentPushToken[xxxxxxxx]",
    "device_id":       "<stable per-install UUID from the client>",
    "platform":        "ios" | "android"
  }
  201:  device row created
  200:  existing (user_id, device_id) row updated (token refresh / last_seen bump)
  body (200/201): { "id": "<row_id>", "registered": true }
  422:  malformed token (must match ^Expo(nent)?PushToken\[.+\]$) or bad platform

DELETE /api/v1/push/devices/{device_id}
  auth:   required
  204:  removed (idempotent — 204 even if the row was already gone; don't leak existence)
```

**Table (`push_devices`)**

| column | notes |
|---|---|
| `id` | surrogate PK (UUID) |
| `user_id` | FK, from the auth token |
| `expo_push_token` | the `ExponentPushToken[...]` string (rotating attribute) |
| `device_id` | stable client install id |
| `platform` | `ios` \| `android` |
| `created_at`, `last_seen_at` | timestamps; bump `last_seen_at` on every register |
| `is_active` | soft-invalidation flag for pruning (optional; or hard-delete) |

- **Unique key: `(user_id, device_id)`** → upsert overwrites the token in place on rotation.
- Add a secondary unique index on `expo_push_token`; on collision, **reassign** the row's
  `user_id` (device changed hands — user B logged in on user A's phone) rather than reject.
- **⚠ Divergence (token vs device as identity):** the intuitive key is the token, but the
  Expo FAQ confirms tokens **rotate** (on reinstall / `applicationId` change) while the
  install is stable. Keying on the token would create a duplicate row on every rotation →
  double-sends. Key on `(user_id, device_id)`.

---

## 3. Notification preferences (multi-channel: email + push)

You already have email preferences (`GET/PUT /api/v1/notifications/preferences`, 14 event
types, single `enabled` boolean). Push must be **independently toggleable per event**, and
we want to add SMS / in-app later without a migration each time.

### ⚠ Divergence & recommendation — normalized channel model

**Recommendation: store a normalized `(user_id, event_type, channel, enabled)` table**, not
a second `push_enabled` boolean column.

| Option | Verdict |
|---|---|
| (a) add `push_enabled` column next to `enabled` | ❌ every new channel = schema migration + nullable columns |
| (b) normalized `(user_id, event_type, channel, enabled)` | ✅ **chosen** — new channel = new enum value + rows, zero schema change; stays queryable |
| (c) JSON `channels` blob | ❌ un-queryable ("who has push on for booth_offline?"), no integrity |

```
notification_preferences
  user_id     FK
  event_type  enum   -- the 14 types in §5
  channel     enum('email','push', future: 'sms','in_app')
  enabled     bool
  updated_at
  UNIQUE(user_id, event_type, channel)
```

- **Sparse rows.** Do **not** pre-create rows. Keep a `DEFAULTS[event_type][channel]` map in
  code (§5). A row is written only when a user changes a toggle. The `GET` endpoint overlays
  defaults so the client always sees a complete matrix; the send path resolves
  `enabled = row.enabled if row exists else DEFAULTS[event_type][channel]`. Changing a
  default is then a one-line code change, not a backfill.
- **Migration from today's email prefs:** backfill one `channel='email'` row per existing
  changed toggle; push is purely additive. Existing email behavior is preserved.

### API shape (what the client consumes)

**Policy (2026-07-07): the preferences endpoint manages EMAIL only.** Push is
**system-controlled**, not a user preference — the backend decides which events push (§5), and
the user's only push control is the OS. So `push` is **never a user-configurable channel**:
it doesn't appear in `channels`/`offered` and cannot be PATCHed.

**⚠ Email offered-channel gating (email-cost control).** The `channels`/`offered` a preference
exposes is **email only, and only for the record-worthy events** (license, subscription/billing,
money-movement — §5). Operational events (`booth_*`, hardware) offer nothing configurable and
are **omitted from the list entirely**. A user can *disable* an email we provide but can
**never enable email we don't offer** — capping email so a few users can't blow the SendGrid
50k/month quota.

Enforce on **three** layers, not just the UI:
1. **GET** returns only email-configurable events (the 8), each with its `email` state.
2. **PATCH** to a non-offered `(event_type, channel)` — including *any* `push` — → **400**.
3. **Send path** never emails an event whose email isn't offered, regardless of any stored row;
   `OFFERED[event_type]` is the source of truth, checked before every send.

```
GET /api/v1/notifications/preferences
  200: {
    "preferences": [
      {
        "event_type": "payment_failed",           // record-worthy → email configurable
        "label": "Payment failed",
        "description": "A subscription payment failed",
        "category": "billing",
        "channels": { "email": true },            // email only; push is not a preference
        "offered": ["email"]
      },
      ...
    ]
    // operational/push-only events (booth_*, hardware) are NOT listed — nothing to configure
  }

PATCH /api/v1/notifications/preferences
  auth: required
  body: { "updates": [ { "event_type": "payment_failed", "channel": "email", "enabled": false }, ... ] }
  200:  { "updated": 1 }
  400:  channel not offered (any push, or email on a non-offered event), or unknown event
```

PATCH (partial upsert of individual `{event_type, channel}` toggles) rather than PUT — the
client sends only the toggles that changed, matching its optimistic-update pattern.

---

## 4. Sending pushes (backend behavior)

### Send

- **Endpoint:** `POST https://exp.host/--/api/v2/push/send`
- **Headers:** `host: exp.host`, `accept: application/json`,
  `accept-encoding: gzip, deflate`, `content-type: application/json`, and — if Enhanced
  Push Security is enabled (§6) — `Authorization: Bearer <EXPO_ACCESS_TOKEN>`.
- **Batch:** ≤ **100 messages** per request (else `PUSH_TOO_MANY_NOTIFICATIONS`); gzip the
  body for large batches.
- **Rate limit:** **600 notifications/sec per project** (≈6 full-batch requests/sec) → throttle + backoff on `TOO_MANY_REQUESTS`.

### Message shape

```jsonc
{
  "to": "ExponentPushToken[...]",
  "title": "Booth offline",
  "body": "Downtown Mall booth went offline",
  "sound": "default",
  "priority": "high",                 // "high" for critical/warning; "normal" for info
  "channelId": "default",             // Android channel the client registers
  "badge": 3,                         // iOS unread count (optional; see §4 badge note)
  "data": {
    "event_type": "booth_offline",
    "severity":   "critical",
    "alert_id":   "<id>",             // lets a tap mark the alert read
    "booth_id":   "<id>",
    "deep_link":  "boothiq://booths?booth_id=<id>"   // reuse EXISTING app routes
  }
}
```

- **Payload ≤ 4096 bytes total** (else `MessageTooBig`). Keep `data` lean.
- **`data.deep_link` must use the app's existing deep-link routes** (`boothiq://alerts`,
  `boothiq://booths?booth_id=`, `boothiq://billing`, `boothiq://settings`) — the app
  already routes these, so tap-to-screen needs no new client routing. Always include
  `alert_id` so a tap can also mark that alert read.

### Receipts & pruning (mandatory — not optional)

A `send` returns **tickets** (queued ≠ delivered). You must then poll receipts:

- **Endpoint:** `POST https://exp.host/--/api/v2/push/getReceipts`, body `{ "ids": [...] }`
  (≤ 1000 ids/request). Receipts are retained **~24 h**; poll **~15 min** after send via a
  cron/reconciliation job (not inline).

| Ticket/receipt error | Backend action |
|---|---|
| `DeviceNotRegistered` | **Prune the token** (delete row / `is_active=false`) — uninstall or dead token |
| `MessageTooBig` | Shrink payload ≤ 4096 bytes |
| `MessageRateExceeded` | Exponential backoff, resend later |
| `MismatchSenderId` | FCM v1 credentials/project mismatch — fix EAS credentials |
| `InvalidCredentials` | APNs/FCM credentials wrong/expired — regenerate in EAS |

Also prune by `last_seen_at` age (e.g. > 6 months) — doubles as a GDPR retention control.

### The send decision (per event)

```
on event(user_id, event_type, alert):
  if resolve_pref(user_id, event_type, 'push') is False: skip
  tokens = active push_devices for user_id
  for batch of ≤100 tokens: POST /send ; store ticket ids
  schedule receipt check (+15 min)
```

`resolve_pref` uses the row if present, else `DEFAULTS[event_type]['push']` (§5). OS-level
permission is enforced client-side, so "no permission" simply means no token registered →
nothing to send to.

---

## 5. Event taxonomy — what should push, and defaults

**Finalized channel policy (product decision, 2026-07-07):**
- **Push is system-controlled, not a user preference.** The **Push** column below is a
  producer decision (does the send path push this event) — there is no user toggle. Push the
  12 events worth interrupting for; **skip the 4 confirmations** so nobody mutes everything at
  the OS level. The user's only push control is the OS switch.
- **Email is the only user preference.** Offered (default ON, user can disable) for the
  record-worthy events — **license** and **subscription/billing**. Money-movement email is
  **planned** (templates deferred). Operational alerts (`booth_*`, hardware) offer **no email
  at all** — not an available channel (omitted from `offered`, PATCH rejected, send path never
  emails them). This is the hard email-volume cap.

**Push** column = system sends a push (Yes/No), not user-overridable. **Email** column = user
preference: `ON` (default on, can disable), `—` (not offered, cannot enable), or `planned`.

**License**

| event_type | severity | push | email | tap → |
|---|---|---|---|---|
| `license_revoked` | critical | **Yes** | ON | `settings` |
| `license_expiry_warning` | warning | **Yes** | ON | `settings` |
| `license_deactivated` | warning | **Yes** | ON | `settings` |
| `license_activated` | info | **No** (confirmation) | ON | `settings` |

**Subscription / Billing** (`payment_failed` = dunning, cadence day 0/3/7/14)

| event_type | severity | push | email | tap → |
|---|---|---|---|---|
| `payment_failed` | critical | **Yes** | ON | `billing` |
| `subscription_cancelled` | warning | **Yes** | ON | `billing` |
| `subscription_renewed` | info | **No** (confirmation) | ON | `billing` |
| `subscription_created` | info | **No** (confirmation) | ON | `billing` |

**Money-movement / critical events** (customer funds — email planned, templates deferred)

| event_type | severity | push | email | tap → |
|---|---|---|---|---|
| `stranded_paid_session` | critical | **Yes** | planned | `booths?booth_id` |
| `payment_result_invalid` | critical | **Yes** | planned | `booths?booth_id` |

`stranded_paid_session` / `payment_result_invalid` come from
`GET /api/v1/booths/{id}/critical-events` and are **not** among the original 14 — add them as
new `event_type`s. Their email channel appears in `offered` once templates ship.

**Booth** (operational → push only; email not offered)

| event_type | severity | push | email | tap → |
|---|---|---|---|---|
| `booth_offline` | critical | **Yes** | — | `booths?booth_id` |
| `booth_unregistered` | warning | **Yes** | — | `booths?booth_id` |
| `booth_registered` | info | **No** (confirmation) | — | in-app feed only (silent) |

**Hardware** (operational → push only; email not offered)

| event_type | severity | push | email | tap → |
|---|---|---|---|---|
| `printer_error` | critical | **Yes** | — | `booths?booth_id` |
| `supply_critical` | critical | **Yes** | — | `booths?booth_id` |
| `pcb_error` | critical | **Yes** | — | `booths?booth_id` |

**Alert-type mapping.** The analytics alerts feed uses free-form `type` strings
(`printer_offline`, `app_error`, `low_supplies`) while preferences use the 14 canonical
`event_type`s. The **backend** maps alert → canonical `event_type` when deciding whether to
push and what to put in `data.event_type` (e.g. `printer_offline → booth_offline` or
`printer_error`; `low_supplies → supply_critical`). Please confirm the mapping table.

---

## 6. Credentials & project config (EAS side — one-time)

None of these are backend code; they're EAS/Expo project settings the backend depends on.

- **Android — FCM v1 (required):** upload a Google **service-account JSON** via
  `eas credentials` (Android → FCM V1). Legacy FCM server keys are dead (Google shut them
  off mid-2024) — must be V1. `google-services.json` (public ids) goes in app config.
- **iOS — APNs:** EAS generates/stores an APNs key (`.p8`); requires a paid Apple Developer
  account.
- **Enhanced Push Security (strongly recommended):** enable "require a valid access token"
  for push in the Expo account settings, then set `EXPO_ACCESS_TOKEN` as a **backend
  secret** and send it as `Authorization: Bearer`. Without this, *anyone* who obtains a
  user's push token can send them arbitrary notifications (tokens are otherwise
  unauthenticated). Never ship this token in the app.

---

## 7. Security checklist

- **Auth on every endpoint** (§1–§3); derive `user_id` from the session token, **never from
  the request body** (prevents IDOR/BOLA — registering/reading another user's devices).
- **Treat Expo push tokens as sensitive/personal data** — TLS only, truncate in logs, delete
  on logout and on account deletion (GDPR erasure includes tokens + preferences).
- **Rate-limit** the write endpoints per user (OWASP API4:2023); enforce max payload size;
  validate token format early.
- **DELETE returns 204 regardless of existence** (no existence leak).

---

## 8. What the client (app) builds once this lands

For your reference — no backend action needed, listed so scope is clear:

- Add `expo-notifications` + `expo-device`, config plugin in `app.json` (icon/color/
  `defaultChannel`), CNG-friendly (no plist edits; `aps-environment` is automatic).
- Contextual permission prompt → `getExpoPushTokenAsync({ projectId })` → `POST /push/devices`;
  re-register on login/token-refresh; `DELETE` on logout.
- `setNotificationHandler` (using current `shouldShowBanner`/`shouldShowList`, **not** the
  deprecated `shouldShowAlert`), received/response listeners, and `useLastNotificationResponse`
  in the root layout for cold-start taps → route via existing `use-deep-links`.
- Local-first alert read-state now; swap to §1 endpoints when live.
- Second (push) toggle per row in the preferences screen against the §3 `channels` shape.
- **Testing requires a development build** — remote push was removed from Expo Go (Android
  SDK 53+). Physical device recommended.

---

## 9. Open questions for the backend

1. Does `GET /analytics/alerts` return a **stable `id`**, and is `is_read` currently
   meaningful or always `false`?
2. OK to **replace** the email-prefs `enabled` boolean with the `channels` object (§3), and
   move to the normalized table? (Client will update the email screen to match.)
3. Should the **critical-events** feed push, and if so add the two new `event_type`s (§5)?
4. Confirm the **alert-`type` → `event_type`** mapping table (§5).
5. Will **Enhanced Push Security** be enabled (so the backend must hold `EXPO_ACCESS_TOKEN`)?

---

## Sources

Official docs, fetched July 2026:

- Expo — [Send notifications (Expo Push Service)](https://docs.expo.dev/push-notifications/sending-notifications/)
- Expo — [Sending notifications (custom server)](https://docs.expo.dev/push-notifications/sending-notifications-custom/)
- Expo — [Push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- Expo — [FCM credentials](https://docs.expo.dev/push-notifications/fcm-credentials/)
- Expo — [Push notifications FAQ](https://docs.expo.dev/push-notifications/faq/)
- Expo — [SDK: Notifications reference](https://docs.expo.dev/versions/latest/sdk/notifications/)
- Expo — [What you need to know](https://docs.expo.dev/push-notifications/what-you-need-to-know/)
- Expo — [Security / access tokens](https://docs.expo.dev/app-signing/security/)
- FastAPI — [Response status codes](https://fastapi.tiangolo.com/tutorial/response-status-code/)
- OWASP — [API4:2023 Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/)
- [Idempotent REST APIs](https://restfulapi.net/idempotent-rest-apis/)
