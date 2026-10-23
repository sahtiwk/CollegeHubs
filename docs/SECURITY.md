# Security policy

Security fixes target the latest code on `main`.

## Reporting a vulnerability

Please do not put credentials, personal data, resume text, or exploitable details
in a public issue or pull request. If GitHub offers **Report a vulnerability** on
this repository's Security tab, use that private channel. Otherwise, contact the
maintainer privately through a contact method published on their GitHub profile
to arrange a secure report.

Include the affected feature and revision, reproduction steps using synthetic
accounts or data, expected and actual behavior, and the potential impact. Redact
tokens, cookies, passwords, connection strings, and personal information.

Test only systems and accounts you are authorized to use. Reproduce against local
disposable databases where possible; avoid accessing other students' information
or disrupting the hosted demo.

## Local configuration

Keep environment files, service credentials, signing keys, database exports, and
private test evidence out of Git. Frontend `VITE_` values are public. If a secret
is exposed, revoke or rotate it; deleting the visible file does not remove it
from Git history.
