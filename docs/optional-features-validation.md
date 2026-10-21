# Optional feature validation - 21 October 2026

## Current status

- GPU: real Intel gen-12lp rendering and explicit device destruction passed in the in-app browser. Static fallback removed the canvas and destroyed the renderer. A 180-frame sample had p95 frame interval 6.3 ms, maximum 6.8 ms; one interaction sample was 4.5 ms. These are local samples, not production LCP, memory certification or a lower-end device matrix. The 2.59 MB optional chunk still exceeds the bundle budget, so the public default remains static.
- Local AI: owner-approved Qwen2.5-1.5B-Instruct Q4_K_M download, pinned official revision and llama.cpp b11669 Vulkan runtime. Artifact hashes and observations are in [the measurement record](optional-features-validation.json). Warm synthetic schema probes passed at 1934/1832/338 ms; the first cold request timed out at 20 seconds. Observed loaded GPU usage was 1263 MiB and server peak working set was about 1.80 GiB; this is not a sampled peak GPU measurement. No grading-quality corpus or public free GPU host has been certified. Local grading remains blocked.
- Streaming: implemented behind `INTERVIEW_STREAMING_ENABLED=true`, using the configured session provider only. A real local model streamed through the application gateway, with three HTTP authorization denials and unchanged saved report/answer verified. Browser feedback completed with real model text. The configured free Groq account also passed a real synthetic streaming probe. Render gateway acceptance is still required before enabling the hosted flag.
- Voice: local-service English speech synthesis and explicit on-device recognition only. No remote speech fallback, automatic microphone capture, audio upload or automatic answer save. Browser language pack installation is offered only after an explicit click when the pack is downloadable. The browser speech pack installed successfully; actual spoken dictation acceptance remains pending.

## Streaming contract

POST `/api/interview/sessions/:id/answers/:questionId/feedback` accepts only a saved answer revision and UUID request ID. Module cookie, exact Origin, CSRF, owned Hub/session/question, provider identity and active answer revision are checked. Authorization and revision are rechecked before every emitted batch. Existing persisted provider lease and hourly/daily budgets serialize generation, evaluation and feedback. Feedback never writes reports, receipts or Aura.

The provider SSE reader forwards only content, not reasoning or tool calls. It bounds context to 8 KB, upstream response to 64 KiB, output to 4000 characters, and provider time to 12 seconds. The route has a 14-second budget; the gateway retains its 15-second upstream timeout. Only this exact POST route accepts NDJSON responses. Request IDs and increasing sequence numbers are checked by the client. Disconnect, question changes, edits, locked state, identity lifetime and explicit cancellation abort work. Partial failed feedback is cleared. The local Vite gateway now forwards stream chunks instead of buffering the entire response.

Voice stops on navigation, hidden document, disabled editing, user cancellation or a one-minute limit. Dictation appends only final results, caps the draft at 2000 characters, and requires the ordinary save action. Cloud-only browsers retain typing. Speech API support is experimental and is checked at runtime; see [MDN on-device speech documentation](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/install_static). Provider transport follows [Groq's documented streaming contract](https://console.groq.com/docs/text-chat).

## Verification and reproduction

Seven focused feedback, lifecycle and gateway/deployment checks passed with disposable MongoDB, zero failures/skips. Final Web production build and Interview syntax build passed.

`scripts/optional-practice-fixture.cjs` starts disposable MongoDB, synthetic Interview data and the local gateway at port 5198. It expects the opt-in local model server on loopback port 8080. Open `/practice-validation.html` for the real shared optional-tools component. `/gpu-validation.html` is a separate diagnostic entry. Neither HTML entry is included by the normal production build. No retained account or deployment configuration is changed by these fixtures.

Private screenshots and raw observations are under `.local/optional-validation/`. Model/runtime binaries remain ignored and are not published to GitHub. Model Apache-2.0 and runtime MIT license files accompany the private downloaded artifacts. The loopback model server is temporary and must be stopped after validation.

## Microphone diagnosis follow-up

The owner approved microphone testing and granted site access. Windows reports the Realtek Microphone Array healthy; user microphone and desktop-app access are Allow, and both audio services are running. The in-app browser enumerates the same Realtek device, but raw getUserMedia fails with NotReadableError / Could not start audio source for both the default device and explicit Realtek selection with audio processing disabled. This failure precedes speech recognition. The exact cause (embedded-browser capture, device contention or driver) remains unresolved; another browser or Windows recorder comparison is needed. The product message now says capture failed rather than incorrectly declaring the microphone absent. No audio was retained or transmitted.

Voice follow-up: owner reports raw capture succeeds in Vivaldi, but recognition stayed at Listening with no transcript. Corrected Stop voice to call recognition.stop() and allow final results, reserving abort() for navigation/cancellation. Added interim transcript preview, real start/audio/speech event status, an explicit no-transcript result and an eight-second finalization timeout. Draft updates from recognition no longer trigger their own cancellation. Web build passed; spoken acceptance of this correction remains pending.
