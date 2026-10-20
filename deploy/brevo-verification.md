# Verification email delivery

Status: adapter implemented; hosted activation awaits Brevo onboarding, sender verification and transactional-email access. Production remains in `unavailable` mode until those steps are complete.

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
