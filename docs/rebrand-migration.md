# BoothIQ rebrand & identifier migration

Notes on the `photoboothapp → BoothIQ` identifier rebrand, kept here because
`app.json` is strict JSON and can't carry inline comments.

## URL schemes — why two are registered

`app.json` registers two schemes:

```json
"scheme": ["boothiq", "photoboothapp"]
```

- **`boothiq`** is the canonical scheme and the default (first entry → used by
  `Linking.createURL` / `makeRedirectUri`). All deep links and the OAuth redirect
  (`boothiq://auth/callback`, see `constants/config.ts` → `OAUTH_CONFIG`) use it.
- **`photoboothapp`** is a deprecated transitional fallback. It is not referenced
  by any app code — it is retained for one release because the OAuth provider /
  backend still allows `photoboothapp://auth/callback`. Keeping it costs nothing
  at runtime and avoids a hard cutover during the rebrand.

**Removal plan:** drop `photoboothapp` from the `scheme` array (and from the OAuth
provider's allowed redirect URIs) once the first `boothiq`-based production build
is verified in the App Store / live, and no client is expected to deep-link with
the old scheme.

## App Store identity

- The shipping bundle id / package is **`com.boothiq.manager`** (iOS and Android).
- The previous id `com.splenwilz.photoboothapp` was **never published** to the App
  Store or Play Store, so there is **no prior app to sunset or run in parallel** —
  `com.boothiq.manager` is the initial public release. (A bundle id is permanent once a
  build is uploaded under an App Store Connect record, so this was set before the
  first build.)

## iOS signing credentials

iOS Distribution Certificate and Provisioning Profile are **EAS-managed** (Expo's
recommended flow): there is intentionally no `credentials.json` and no credential
block in `eas.json`. EAS creates and stores them during the first
`eas build --platform ios` (interactive Apple sign-in). Submission uses an
EAS-managed App Store Connect API key.
