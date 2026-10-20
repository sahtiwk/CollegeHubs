# TP9.1 — inference and contextual guidance

Implementation date: 2026-10-20.

## Enabled capabilities and boundaries

| Capability | Implemented behavior | Activation / evidence |
| --- | --- | --- |
| Curated Interview practice | Five original questions, owned saved answers and immutable ungraded self-review; no score, completion event or Aura | Available without an inference provider |
| Groq Interview | Existing fixed `openai/gpt-oss-20b`, validators, rubric, budget and evaluation leases retained | Optional; requires key and `GROQ_FREE_CONFIRMED=true`. Regression transport is synthetic, not evidence of live free-account eligibility |
| Local Interview | Fixed `Qwen/Qwen2.5-1.5B-Instruct` through a loopback OpenAI-compatible server; generated questions must pass existing validation | Explicit opt-in. Question generation only; grading is blocked and sessions finish as ungraded self-review |
| Learn guidance | Approved topic and resource summaries, lexical ranking of up to three related resources, attributed template | Default; no model or embeddings required |
| Optional Learn explanation | Local model only, bounded structured explanation, owner/content/version cache and template/last-good fallback | Off by default; requires schema 5 and both tutor/local flags |
| Wikipedia reading | Fixed reviewed topic, bounded response, seed/last-good fallback | Existing opt-in retained; network work now runs outside the learner transaction |

No private content automatically fails over to another provider. Graded sessions
retain their original provider/model; changing configuration cannot silently
replace their grader. Previously completed reports remain readable when inference
is disabled. Local models cannot produce rewardable reports.

## Configuration and data

`INTERVIEW_AI_PROVIDER` is `groq` (default), `local`, or any disabled value.
`INTERVIEW_AI_ENABLED=false` disables Interview inference. Local operation requires
`LOCAL_INFERENCE_ENABLED=true`; `LOCAL_INFERENCE_MODEL` must be the exact supported
model above. `LOCAL_INFERENCE_URL` defaults to
`http://127.0.0.1:8080/v1/chat/completions`; only HTTP loopback, that exact path,
and no credentials/query/fragment are accepted. Redirects are rejected.

`LEARN_TUTOR_ENABLED=true` independently opts Learn into local explanation.
Learn never reads Interview resumes, answers or Groq credentials. It sends only
the approved node/resource context and does not fetch user-supplied URLs.

Inference caps context at 24,000 UTF-8 bytes, response at 65,536 bytes and output
at 2,500 tokens. Interview requests default to ten seconds (hard maximum twenty);
Learn uses five seconds. Truncated, malformed and cancelled responses fail
explicitly. Domain validators remain authoritative.

Learn migration `0005_contextual_tutor` adds an owner-scoped explanation cache.
Readiness accepts schema 2–5; templates work without migration. Follow the existing
backup and explicit migration dry-run/apply procedure before enabling model
guidance. Startup does not migrate retained data. Schema 5 requires compatible
code; rollback to older schema support requires restoring the coordinated backup.

Resource and tutor lookups authorize and reserve a persisted retry lease, release
the transaction, fetch, then re-authorize before storing. Enrollment generation
changes invalidate in-flight responses. A failed refresh leaves a one-hour
negative cache; successful values have a 24-hour refresh interval. Cache writes
must still own the reservation token.

## Local feasibility gate

Host checked: Intel Core i5-13450HX (10 cores), 16,763,609,088 bytes system RAM
(15.61 GiB), NVIDIA GeForce RTX 5050 Laptop GPU. `nvidia-smi` reported 8,151 MiB
total GPU memory and 7,865 MiB free at observation. These are capacity observations,
not a model-load or peak-memory benchmark.

The exact model's [upstream model card](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)
declares Apache-2.0, 1.54 billion parameters and BF16 weights. The proposed
OpenAI-compatible runtime, [llama.cpp](https://github.com/ggml-org/llama.cpp/blob/master/LICENSE),
uses MIT. No llama-server or Ollama executable was found on PATH; no runtime
version, quantization artifact or model weights were installed/certified here.
Any deployed artifact must retain its own notices and record its exact version
and checksum. No public inference hosting or free GPU allocation is established.

`node services/interview/scripts/benchmark-local.cjs` is a reproducible local-only
synthetic probe; it reads no private resumes or credentials. Both the 500- and
8,000-character synthetic resume probes failed because no local server was
running (48 ms and 2 ms connection failures in the final probe). A separate
10,000-character synthetic answer comprehension probe also failed in 1 ms.
These timings are **not inference latency**. Model quality, token throughput,
worst-case inference latency and peak server/GPU memory remain unmeasured.
Client RSS is explicitly not a server-memory measurement.

**Gate decision: local grading and deployment certification are not approved.**
The adapter is available for opt-in experiments; curated practice and template
guidance are the usable default fallback. There is no paid fallback or automatic
model download. The existing Groq path remains optional, subject to current
account eligibility and [official model support](https://console.groq.com/docs/models).

## Verification

Focused contract checks cover fixed endpoint/model restrictions, context and
response limits, cancellation, timeouts, malformed/truncated output and prohibited
local grading. Database checks cover learner reset during a pending resource
fetch, foreign/locked/wrong-resource tutor access, explanation caching, and
provider-disabled owned practice with immutable self-review and no reward event.

- Full disposable integration suite: **171 passed, zero failed or skipped**.
  The initial unconstrained parallel run overloaded the local fixture and produced
  timeouts; the fixture now limits test concurrency to two. A fresh run passed.
- Retained-store migration/restore suite: **10 passed**, including schema 5.
- Focused inference suite: **3 passed**, additionally exercising cancellation
  during a request, stale tutor response rejection, changed-provider refusal and
  saved graded report reads with inference disabled.
- Learn TypeScript build and web TypeScript/production build passed. The existing
  large shader bundle warning remains.
- Chrome mobile (390 × 844, reduced motion): asserted provider unavailable,
  completed five saved curated answers, reloaded the immutable self-review,
  confirmed no score meters, and opened attributed template guidance after
  migrating the disposable Learn database to schema 5. No horizontal overflow.
  Screenshots were visually inspected:
  [self-review](screenshots/tp9.1-self-review-mobile.png) and
  [guidance](screenshots/tp9.1-tutor-mobile.png).
- [Synthetic local feasibility output](tp9.1-local-feasibility.json) records
  unavailable-server failures; it does not establish model performance.

No retained user database was migrated, no deployment was performed, and no live
Groq grading or local model quality certification is claimed.
