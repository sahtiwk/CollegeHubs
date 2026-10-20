# TP3.1 — Campus editorial foundations

Historical design specification. The current implementation uses `/dashboard` for member Home, retains the profile dialog, and has completed the feature redesign phases through TP10.2. See the [current route/state audit and usability limitations](tp10.2-evidence.md); intended routes below describe the original proposal rather than additional mounted destinations.

Implemented and reviewed locally on 19 October 2026. TP3.1 establishes semantic
tokens, controls, motion preferences, navigation/layout specifications and a
bounded shader feasibility prototype. It does not implement the public landing,
new auth flows or the later feature redesigns. Existing application routes,
server contracts, Hub IDs and membership decisions remain unchanged.

## Visual direction and token ownership

Direction revised after user review on 19 October 2026: **bold campus editorial**.
Use warm paper, deep botanical ink, cobalt actions, oversized sans headings with
selective italic serif emphasis, fine dividers and squared-off controls. The
public composition pairs a headline with an original CSS/SVG collage: a taped
note, orbital linework, apricot flower and citron ticket. White work surfaces
stay quiet and functional. Typography uses system sans, serif and mono stacks.
The remote Archivo/Abril Google Fonts import is removed. No font
binary or new font license is required; no self-hosted font was selected.

`apps/web/src/styles/tokens.css` owns semantic token version 2. CSS imports run
in deliberate order: Tailwind reset/utilities, tokens, base elements, retained
workspace/feature layout, shared primitives. Existing lazy feature CSS remains
owned by Learn/Interview/Arcade until its redesign ticket. Existing legacy token
names bridge to the new neutral semantics, rather than duplicating a second
visual system. This phase uses one complete light theme; it introduces no mode
toggle or untested full dark theme.

| Role | Token / value | Use |
|---|---|---|
| Canvas / reading panels | `--canvas #F6F5EE`, `--panel #FFFFFF`, `--panel-subtle #EDEEE5` | Page, cards, quiet controls |
| Main / supporting text | `--ink #20241E`, `--ink-muted #50594B` | Body, labels, hints, unavailable controls |
| Action / hover | `--primary #2447D8`, `--primary-hover #1935AF`, white text | One primary action per task |
| Controls / focus | `--line #737B6C`, cobalt focus; `--focus-on-dark #DCE4FF` | Visible input boundaries and keyboard position |
| Success / caution / error / info | `#166534 / #854D0E / #B91C1C / #1E40AF` with separate light surfaces | Text/icon labels always accompany color |
| Public hero | Paper headline beside cobalt `#2447E8` collage; dark fallback tokens retained for shader experiment | Useful HTML above decoration |
| College identity | `--hub-accent`, `--hub-on-accent`, `--hub-secondary` | College badge/stripe, not reading surfaces |

`sanitizeTokens` retains the existing hex-only allowlist. `themeStyle` now maps
college accent/secondary to identity-only properties and chooses white or black
badge text for at least 4.5:1 contrast. It cannot replace the neutral page/control
tokens. HubThemeProvider still binds the name, logo, accent and themeVersion to
the actual Hub, discards stale account responses and retains the existing cache
rules. Name/logo semantics and the logo referrer policy are preserved.

The CVR fixture and contrasting Sky fixture use the same original plum accent
but different supplied backgrounds. Both now retain their accent while reading
on the same neutral surfaces. A white-accent stress case verifies readable badge
text. This is intentional separation of college identity from readability, not
a change to stored college records or their theme versions.

Spacing: 4/8/12/16/24/32/48/64px. Controls: practical 44px minimum height,
5px radius; cards: 8px radius. Reading copy should remain around 70ch; long code
stays in contained scroll areas. Responsive headings use fluid sizing. Motion
tokens are 150ms controls, 220ms panels, 320ms optional entrances; no scroll
hijacking or layout animation. `useMotionPreference` respects OS reduced motion
and the stored `collegehubs-motion` setting. OS reduction wins over user opt-in;
storage denial does not prevent the in-memory switch from working.

## Component and state catalogue

`components/ui/index.jsx` provides Button, Card, Field, Status, EmptyState and
the existing native Dialog. All new primitives/hooks are JavaScript; no new
unchecked TypeScript was introduced. Existing `tsconfig.arcade.json` coverage
is unchanged. Native dialog focus handling now includes select controls.

| Component | States / behavior | Accessibility contract |
|---|---|---|
| Button | Primary, secondary, quiet, disabled, busy | Native button, default `type=button`, 44px; busy also disables repeated action; explicit descriptive label |
| Field | Empty, populated, hint, invalid | Stable label/id; hint/error linked by `aria-describedby`; invalid state not just color |
| Card | Reading/task grouping | Semantic section by default; caller supplies heading or chooses another element |
| Status | Success, warning, error, info | Text explanation; opt-in polite live status for changing results |
| EmptyState | Missing content plus one useful action | No fake activity or forced engagement |
| Dialog / drawer | Open, closed, keyboard cycle, cancel | Native modal, visible close, Tab/Shift+Tab containment including select, Escape closes, focus returns to opener |
| ShaderBackdrop | Static, enhanced, fallback | Decorative and `aria-hidden`; no required content or controls in canvas |

Cross-page states to implement in the owning feature ticket:

| State | Presentation | Next action / preserved state |
|---|---|---|
| Initial loading | Stable layout, concise status; `aria-busy` on changing region | Keep navigation usable; no endless decorative spinner |
| Empty | Explain what can be created or started | One specific action; no fabricated peers or counts |
| Saved/success | Clear receipt/save acknowledgement | Continue, review or dismiss; reward only after confirmed receipt |
| Offline/error | Plain explanation scoped to affected service | Retry; keep drafts, request IDs and acknowledged work |
| Pending delivery | Result is saved, reward is pending | Keep result accessible; avoid duplicate submission |
| Stale module summary | Label age/unavailable source | Continue Core; bounded refresh using existing contracts |
| Forbidden/expired | Explain reconnect or membership prerequisite | Safe sign-in/reconnect; do not display another owner's cached content |
| Disabled capability | Explain unavailable action without fake CTA | Alternative supported action; no automatic paid fallback |
| Validation | Error adjacent to field plus summary when needed | Preserve other input and move focus only when useful |
| Reduced motion/GPU failure | Same useful text, controls and static art | No install prompt or account requirement |

## Route and navigation specification

These destinations are a specification for TP3.2/TP4, not newly mounted routes.
The current protected `/` remains unchanged in TP3.1. TP3.2 must deliberately
move the member home to `/home` and update every home link together; an anonymous
landing must never fetch private Hub data. Keep only allowlisted relative
post-login intent. Verification/session handoff depends on TP1/TP2.

| Destination | Current | Intended treatment / owner |
|---|---|---|
| Public product entry | No public `/` (member Dashboard) | `/` landing in TP3.2; sample-only previews |
| Sign in / join | `/login`, `/register` | Preserve; TP1/TP2 identity semantics, TP3.2 clear eligibility/intent |
| About / source | `/about` | Preserve; footer links to scoped license/distribution notice, not “all MIT” |
| Member Home | `/` | `/home` in TP3.2; purposeful continuation redesign TP4/TP10 |
| Channels | `/channels/:id` | Keep deep links; member channel directory/navigation in TP4 |
| Study | `/channels/:id/study`, `/study-rooms/:id` | Keep lobby/room deep links; Study entry lists permitted channels/rooms in TP4 |
| Learn / Interview / Arcade | `/learn/*`, `/interview/*`, `/arcade`, `/arcade/:gameId/:id?` | Keep module journeys and lazy loading; redesign in TP7–TP9 |
| Calendar | `/contests` | Label Calendar/contests accurately; schedule expansion TP6; no fake export |
| Progress / leaderboard | `/leaderboard`, current Dashboard progress cards | Easy secondary navigation; richer progress TP5/TP10 |
| Settings | Current edit-profile dialog | Keep actual dialog; do not link a nonexistent settings page |

Desktop (at least 1024px): compact header with product/home, college identity and
account action; a stable left navigation with Home, Channels, Study, Learn,
Interview, Arcade, Calendar. Progress/Leaderboard and profile sit in a secondary
group. Active links use `aria-current`; no nonfunctional global search.

Tablet/mobile: compact header with labeled **Menu** button and current college;
one native drawer containing the same destinations. Do not add a bottom nav and
drawer at once. Close after selection, return focus on cancel, retain a skip link
and focus the destination main heading on route change. At 320px, stack controls
and cards, allow long names to wrap and contain code overflow. Sticky elements
must not obscure anchor/focus positions. The existing shell adopts layouts in
TP4; this phase supplies the native drawer primitive and verifies it in the lab.

## Page composition for subsequent tickets

- **Landing (TP3.2):** public header; headline “Your campus. Your next breakthrough.”;
  Join and Explore actions; labeled sample workspace tabs; four intentions;
  join/action/progress workflow; connected learning story; honest Aura/community
  explanation; eligibility, privacy/free-host FAQ and scoped-source footer.
  Examples remain bundled/local and cannot mint points or read Hub content.
- **Home (TP4/TP10):** continuation and one useful next action first; today's
  schedule, channels and concise progress next; feed follows, with explicit
  Load more. No endless feed or fake live counters.
- **Channels (TP4):** subject heading/search, readable thread, accepted-answer
  hierarchy, compact typed composer; retain draft and retry identity.
- **Study (TP4):** lobby, solving and review are distinct; timer/save status stay
  visible; side-by-side comparison collapses to stacked source on mobile.
- **Learn (TP8):** domain entry, roadmap with equal keyboard/list access, reading
  column and prerequisites; saved assessment answers and honest result basis.
  Five domains/path completion remain future work, not claimed by this catalogue.
- **Interview (TP9):** resume preparation, draft setup, answering, report; privacy,
  AI availability and pending reward states visible alongside saved work.
- **Arcade (TP7):** concise playable catalogue, ranked/casual labels, clear round
  controls; daily challenge remains a future feature until its gates pass.
- **Calendar/Progress (TP5/TP6/TP10):** provenance and cached freshness; separate
  engagement/external/streak/assessment meanings; immutable receipt explanations.

## Shader feasibility decision: static remains default

Inspected and installed exact **`shaders@4.0.4`**, npm integrity
`sha512-NB+/RiK0oydteeeKdPqsLpR3iSoDTvt8bsdgw2wPb697QVCY/yadZV8gitCyCQx5t/kb4nJicIR+cbG9Q6JFfQ==`.
Primary source: [Shaders repository](https://github.com/shader-effects-inc/shaders),
with the actual installed package manifest and `dist` source used for this review.
React/ReactDOM peers accept 18 or 19. The React entry builds against this app's
React 18; the prototype uses the package's JS instance API inside a React effect
for explicit pause/resume/destroy ownership. A separate local React-entry bundle
probe compiled successfully; no live React-binding GPU test is claimed.

Direct runtime dependency: `typegpu@0.12.3`. New transitive packages are
`tinyest@0.3.4`, `typed-binary@4.3.3`, `tsover-runtime@0.0.7`. Licenses are MIT
except tsover-runtime (Apache-2.0); exact installed notices are retained in
`docs/licenses/`. No framework switch, hosted editor/account, preset subscription,
paid font, model or remote asset is used. No existing dependency version changed.

Source audit found telemetry sampling at 5%, with a possible POST to
`https://shaders.com/api/telemetry`. `disableTelemetry: true` is explicitly passed.
No Preview/remote preset component or CLI is invoked. The composition is original
local configuration: one FlowingGradient layer, ink/violet/teal, speed .25,
distortion .3, seed 7. Package source remains third-party; the composition is
CollegeHubs-owned. Optional texture/video/preview APIs are not used.

Lifecycle contract in `ShaderBackdrop.jsx`:

- Static CSS exists before import. Actual low-power adapter/device acquisition
  must succeed before the dynamic engine import. Missing GPU/adapter, save-data,
  reduced motion and user motion-off retain the static hero.
- Own the acquired GPU device and a separate canvas per effect run. Offscreen
  or hidden documents pause rendering; visible documents resume. Device loss,
  failed import/init or a 15-second startup timeout destroys resources and keeps
  CSS. Late async initialization after unmount is disposed. All observers and
  event listeners are removed on cleanup; no GPU state enters a server contract.
- Logical canvas is fixed at 480×280, not scaled to the full page. Package 4.0.4
  source caps DPR at 1.5 for its mobile GPU profile or 2 otherwise (at most
  960×560 backing pixels here). No shaders run behind editors or timed games.
- Text/buttons remain HTML above the overlay. The enhancement defaults to false;
  only the isolated catalogue offers a deliberate opt-in feasibility control.

Acceptance budget for future hero activation: optional compressed JS at most
100 KB, zero third-party requests, no default download/GPU under reduced motion,
no repeated >50ms main-thread stalls, and p95 frame interval at most 33ms on a
documented supported lower-end profile. Text/control contrast must pass without
relying on any particular animated frame. These are local release gates, not
claims of product-wide NFR attainment.

Measured editorial catalogue production build: static JS **52.18 KB gzip**, CSS **9.48 KB
gzip**; lazy shader engine **729.01 KB gzip / 2.63 MB raw**. The engine fails the
100 KB optional budget by more than seven times. The normal application build
does not include the catalogue or shader chunk because neither is imported into
the active routes. It remains a prototype for a future smaller implementation,
not a recommendation to activate this package on the landing.

Throttled Chromium 151 headless, 390×844 viewport, DPR 2, 4× CPU slowdown,
1.6 Mbps download / 150ms latency, cold cache (one comparison, not a field study):

| Mode | FCP / LCP | Long tasks | p95 animation-frame interval | Result |
|---|---|---|---|---|
| Static | 1156 / 1156 ms | None observed | 16.7ms | Useful HTML/CSS, no shader download |
| Enhancement requested | 1180 / 1180 ms | None observed | 16.8ms | Adapter unavailable; fallback in 59ms, no shader download |

This environment supplied no real WebGPU adapter, including a separate local
software-adapter probe. **No successful enhanced GPU rendering, GPU FPS or
physical low-end hardware result is claimed.** Lifecycle failure/pause/cleanup
checks use explicitly injected renderer/device faults and are distinguished from
real rendering. The unsupported path and oversize bundle both justify retaining
the static default; a future activation requires new supported-device evidence.

## Verification and reproduction

The local catalogue is `apps/web/design-lab.html`; it is a separate Vite build
entry, not a public member route. To inspect it without any backend:

```powershell
npm run test:design
npm run build:design-lab
npm run preview:design-lab
# Open http://127.0.0.1:5193/design-lab.html
```

The isolated build writes only `.local/tp31/dist`. Browser checks use Playwright
and its isolated Chromium installation. Set `PLAYWRIGHT_MODULE` to a locally
installed Playwright package when it is not in root modules, then run
`npm run test:design-browser` with the preview running. No new permanent browser
test dependency was added to the application. First install/start failure on
the system Edge binary was resolved by using isolated Chromium; a test harness
scroll correction made the intentional offscreen shader gate observable.

Focused checks cover semantic contrast, untrusted/bright Hub palettes, modal
keyboard open/trap/select/Escape/focus return, navigation close, 390/320px overflow,
OS reduction, persisted motion-off, null-adapter fallback, injected import/device
loss cleanup, offscreen/document-hidden pause/resume, and no external requests.
Normal text pairs meet 4.5:1; control boundaries and focus meet 3:1. Hero muted
text and focus were checked against each gradient endpoint as well as the ink
surface. Existing disabled controls are exempt from WCAG contrast, but new UI
disabled/busy text still uses the tested muted/panel pairing.

Desktop and 390/320px screenshots were visually inspected for clipped headings,
wrapping, field errors, spacing and control layout. This is local review of the
foundations/catalogue, not certification of every future feature screen.
Evidence is in `.local/tp31/browser-results.json`, `browser.log`, `lab-build.log`,
`build.log` and the screenshots. No hosted UI, provider account or database was changed.

Initial foundation verification (2026-10-19): all five workspace builds passed; the
existing integration suite passed 108 tests with zero failures or skips.
The two focused contrast/identity tests and all eleven browser checks passed.
Synthetic CVR desktop and Sky mobile sign-ins also passed against the local
fixture, with neutral surfaces, preserved Hub names, no horizontal overflow,
and mobile menu Escape/focus return. External requests were blocked in that
smoke check. The normal web entry is 111.57 kB gzip and excludes the shader
chunk. These results do not establish performance on a real GPU.

Saved catalogue evidence: [desktop](screenshots/tp3.1-desktop.png),
[mobile](screenshots/tp3.1-mobile.png), and
[browser measurements](tp3.1-browser-results.json).

Editorial revision verification (2026-10-19): normal web build and isolated
catalogue build passed, both contrast tests passed with additional paper/citron
and cobalt pairings, and all twelve browser checks passed. The sample workspace
supports Learn/Study/Practice tabs with arrow/Home/End navigation and expandable
local steps. The mobile collage was adjusted after visual review to prevent
the ticket covering the note. Screenshots and measurements above now reflect
this revision; the earlier 108-test backend result was not rerun for this visual
change. Shared tokens update the app palette; the editorial compositions and
sample journeys remain in the isolated catalogue until the feature tickets.
No remote assets or new packages were introduced by the redesign.
