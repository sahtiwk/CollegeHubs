# Public landing (TP3.2)

Implemented 2026-10-19 in the selected bold campus editorial direction: warm paper, cobalt, oversized type and system-serif accents. `/` is public; `/dashboard` is the protected workspace. Existing workspace brand/sidebar/back links now target `/dashboard`. Unknown routes show an explicit recovery page. Login and registration retain allowlisted return destinations; Channels and Study previews lead to the dashboard because the user's real channel IDs are not public.

The five previews are original bundled examples with one or more local interactions: reveal an explanation, compare pseudocode, explore topics, write an unsaved practice opening, and swap neighboring numbers. Switching tabs clears sample state. They import no module providers, call no APIs and award no points. Eligibility, mail/provider availability, hosting sleep, privacy and current reward limitations are disclosed. No testimonials, institutional endorsements or invented usage counts appear.

Public routes suppress auth bootstrap and focus/timer renewal; private navigation restores the cookie session. A non-secret returning-user marker changes the CTA to Continue, but never grants access. Protected routes still validate via Core. College branding loads only inside the protected workspace. Workspace/auth feature chunks are lazy; Google SDK mounting is limited to auth pages. The existing optional shader is lazy, off by default, limited to the hero, and honors reduced motion and the user toggle. The static layout is the baseline; shader failure changes no content or geometry.

## Assets and source

`apps/web/public/social-preview.svg` is original code-authored vector artwork using simple geometric lines, project text and system fonts. `social-preview.png` is its 1200×630 browser render for social cards. Both are covered by the original-work MIT license; no stock images, remote font, generated bitmap or paid preset was used. Preview text/pseudocode and landing CSS are original project work. Existing shader dependency notices remain in the source manifest. Footer links use the repository's configured Git remote and its LICENSE/THIRD_PARTY files; public availability of unpushed files depends on publication.

Metadata includes title, description, Open Graph text and image. The image path is origin-relative; set a verified absolute deployment image URL and canonical URL when publishing to maximize crawler compatibility. No production hostname was guessed.

## Validation

`npm run test:landing` uses Playwright and the local Vite instance on 5195. Set `PLAYWRIGHT_MODULE` if Playwright is supplied externally. It verifies all five interactions, keyboard tab movement, reduced motion, safe feature entry links, return-intent carriage into registration, returning-user CTA, protected-route sign-in redirect, explicit 404, optional effect loading and zero API requests while exploring public samples. Screenshots at 360/768/1280 are in `.local/tp32`; desktop and mobile were visually inspected. The production build passes; existing return-intent and semantic contrast checks pass.

Local warm production-preview measurement: headless Chromium, 1280×900, loopback server, no CPU/network throttle, reduced motion; CLS 0, measured tab-click completion 83 ms, no shader engine request. 200% CSS zoom at a 640×450 viewport produced no horizontal document overflow. LCP was not emitted by this headless run and is unverified, not zero. These are local checks, not a claim of slow-mobile or hosted N1 acceptance. The entry JS is approximately 256 kB / 86 kB gzip. The optional shader engine is approximately 2.63 MB / 729 kB gzip and triggers the existing large-chunk warning; it is absent from ordinary landing requests and remains opt-in.

No hosted deployment, live user study, public-source publication or external provider operation was performed. Production performance and social-card crawler checks remain release checks.
