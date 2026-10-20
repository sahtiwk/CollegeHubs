# Verification email delivery

Status: activated on 20 October 2026. Core revision `90980bb4c263bd022527a307fe60feed0eaa3491` is live in Render deployment `dep-dbbr1uon74is739ekdg0`. The signed-in production account response reports `{available:true,mode:"brevo"}`; readiness and login both returned HTTP 200. The public privacy notice includes Brevo.

The verified CollegeHubs sender uses the operator's signup email. A restricted key with only Transactional email access is stored in Core's server environment. It expires 20 October 2027, or after 90 days unused. The key is excluded from Git and web assets.

The operator-approved test message received HTTP 201 and a subsequent Brevo `delivered` event. This confirms acceptance by the recipient's mail server, not inbox placement or that the person opened it. No account verification was fabricated by the test. A real user's signed-in verification-link consumption remains a manual acceptance check. All 11 targeted mail, identity and deployment tests passed; Core's build passed.

Core alone needs these server environment settings:

| Setting | Value |
| --- | --- |
| `VERIFICATION_MAIL_MODE` | `brevo` after activation |
| `BREVO_API_KEY` | Private Brevo API key; never a web build variable |
| `VERIFICATION_MAIL_FROM` | Verified sender email in the Brevo account |
| `APP_ORIGIN` | `https://collegehubs.pages.dev` |
| `ALLOWED_ORIGINS` | Must include the exact app origin |

Use the free account. Brevo's free allowance is 300 emails/day. A sender using a free email provider can have its sending domain replaced by a Brevo-managed subdomain; this is not a purchased mailbox or an address the app owns.

Before activation, disclose Brevo's processing of recipient addresses and verification messages in the public privacy notice. Configure the sender and confirm that transactional sending is enabled. Store the key only in private operator storage and Core's server environment. Deploy the tested Core revision with the configured settings.

Request one verification email through a signed-in account whose owner authorized the test. Provider acceptance (HTTP 201) does not prove inbox delivery. Confirm arrival and consumption through the app; then confirm that the same link cannot be consumed again. Do not send a bulk verification campaign to retained accounts.

Requests use a fixed HTTPS provider endpoint, refuse redirects, time out after ten seconds and do not automatically retry. Failed requests leave their challenge unusable. Existing per-user cooldowns and hourly limits apply. Provider response bodies are discarded; public errors contain neither recipient nor token. Links contain the challenge and token in the URL fragment, and confirmation still requires the corresponding signed-in account.

To suspend sending, set `VERIFICATION_MAIL_MODE=unavailable` and redeploy Core. Do not use local capture with hosted data. This does not revoke email verification already completed.

Validation: `node --test tests/identity/verification-mail.test.js tests/identity/verification.test.js`.
