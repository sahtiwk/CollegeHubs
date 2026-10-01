'use strict';

/**
 * adzunaClient.js — §2.4 Resilient Adzuna HTTP Client
 *
 * Wraps every outbound call to api.adzuna.com with three resilience layers:
 *
 *   ┌────────────────────────────────────────────────────┐
 *   │  Circuit Breaker  (outermost — fail fast when down) │
 *   │  ┌──────────────────────────────────────────────┐  │
 *   │  │  Retry + Exponential Backoff (up to N times) │  │
 *   │  │  ┌────────────────────────────────────────┐  │  │
 *   │  │  │  Timeout (hard deadline per attempt)   │  │  │
 *   │  │  └────────────────────────────────────────┘  │  │
 *   │  └──────────────────────────────────────────────┘  │
 *   └────────────────────────────────────────────────────┘
 *
 * Circuit Breaker states:
 *   CLOSED    — normal operation
 *   OPEN      — service down; requests fail immediately (no network call)
 *   HALF_OPEN — one probe request allowed; closes on success, reopens on failure
 *
 * Configuration (all via env vars, sensible defaults):
 *   ADZUNA_TIMEOUT_MS          Per-attempt timeout      (default 2500ms)
 *   ADZUNA_MAX_RETRIES         Retries after first fail  (default 2 → 3 total)
 *   ADZUNA_RETRY_BASE_DELAY_MS Exponential backoff base  (default 400ms)
 *   ADZUNA_CB_FAILURE_THRESHOLD Failures to OPEN circuit (default 5)
 *   ADZUNA_CB_SUCCESS_THRESHOLD Successes to re-CLOSE    (default 2)
 *   ADZUNA_CB_OPEN_TIMEOUT_MS  Time in OPEN before probe (default 30000ms)
 */

const https = require('https');

// ─── Configuration ────────────────────────────────────────────────────────────
const REQUEST_TIMEOUT_MS   = parseInt(process.env.ADZUNA_TIMEOUT_MS,           10) || 2500;
const MAX_RETRIES          = parseInt(process.env.ADZUNA_MAX_RETRIES,          10) || 2;
const RETRY_BASE_DELAY_MS  = parseInt(process.env.ADZUNA_RETRY_BASE_DELAY_MS,  10) || 400;
const CB_FAILURE_THRESHOLD = parseInt(process.env.ADZUNA_CB_FAILURE_THRESHOLD, 10) || 5;
const CB_SUCCESS_THRESHOLD = parseInt(process.env.ADZUNA_CB_SUCCESS_THRESHOLD, 10) || 2;
const CB_OPEN_TIMEOUT_MS   = parseInt(process.env.ADZUNA_CB_OPEN_TIMEOUT_MS,   10) || 30_000;

// ─── Connection Pool (HTTP Keep-Alive Agent) ──────────────────────────────────
// A persistent HTTPS agent reuses TCP/TLS connections across requests.
// Without this, every Adzuna call pays the TLS handshake cost (~200–400ms).
//
// maxSockets     : max parallel connections to api.adzuna.com (default 10)
// maxFreeSockets : idle connections kept alive between requests (default 5)
// keepAliveMsecs : interval between TCP keepalive probes (ms)
const httpsAgent = new https.Agent({
  keepAlive     : true,
  maxSockets    : parseInt(process.env.ADZUNA_POOL_MAX_SOCKETS,      10) || 10,
  maxFreeSockets: parseInt(process.env.ADZUNA_POOL_MAX_FREE_SOCKETS, 10) || 5,
  keepAliveMsecs: 10_000,  // send keepalive probes every 10s
  timeout       : REQUEST_TIMEOUT_MS + 500, // slightly above request timeout
});

// ─── Circuit Breaker ──────────────────────────────────────────────────────────

const CB_STATE = Object.freeze({
  CLOSED   : 'CLOSED',
  OPEN     : 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
});

class CircuitBreaker {
  /**
   * @param {object} [opts]
   * @param {number} [opts.failureThreshold]
   * @param {number} [opts.successThreshold]
   * @param {number} [opts.openTimeoutMs]
   * @param {string} [opts.name] - Label for log messages
   */
  constructor(opts = {}) {
    this.name             = opts.name             ?? 'CircuitBreaker';
    this.failureThreshold = opts.failureThreshold ?? CB_FAILURE_THRESHOLD;
    this.successThreshold = opts.successThreshold ?? CB_SUCCESS_THRESHOLD;
    this.openTimeoutMs    = opts.openTimeoutMs    ?? CB_OPEN_TIMEOUT_MS;

    this._state        = CB_STATE.CLOSED;
    this._failureCount = 0;
    this._successCount = 0;
    this._openedAt     = null;
    this._halfOpenLock = false; // allow only ONE probe request at a time
  }

  get state() { return this._state; }

  // ── State transitions ──────────────────────────────────────────────

  _open(reason = '') {
    this._state        = CB_STATE.OPEN;
    this._openedAt     = Date.now();
    this._successCount = 0;
    console.warn(`[${this.name}] → OPEN after ${this._failureCount} failure(s)${reason ? ` (${reason})` : ''}`);
  }

  _halfOpen() {
    this._state        = CB_STATE.HALF_OPEN;
    this._halfOpenLock = false;
    this._successCount = 0;
    console.log(`[${this.name}] → HALF_OPEN — sending probe request`);
  }

  _close() {
    this._state        = CB_STATE.CLOSED;
    this._failureCount = 0;
    this._successCount = 0;
    this._halfOpenLock = false;
    console.log(`[${this.name}] → CLOSED — service recovered`);
  }

  // ── Outcome handlers ───────────────────────────────────────────────

  _recordSuccess() {
    if (this._state === CB_STATE.HALF_OPEN) {
      this._successCount++;
      if (this._successCount >= this.successThreshold) this._close();
    } else {
      this._failureCount = 0; // reset on success in CLOSED
    }
  }

  _recordFailure(err) {
    // 4xx = client error — don't penalise the circuit for bad requests
    if (err?.status && err.status < 500) return;

    this._failureCount++;

    if (this._state === CB_STATE.HALF_OPEN) {
      // Failed probe → reopen immediately
      this._open('probe failed');
    } else if (this._failureCount >= this.failureThreshold) {
      this._open(`threshold ${this.failureThreshold} reached`);
    }
  }

  // ── Main execute ───────────────────────────────────────────────────

  /**
   * Execute an async function through the circuit breaker.
   *
   * @template T
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   * @throws {Error} CIRCUIT_OPEN (503) when circuit is OPEN
   * @throws {Error} CIRCUIT_PROBE_BUSY (503) when HALF_OPEN probe is in progress
   */
  async execute(fn) {
    // ── Evaluate current state ──────────────────────────────────────
    if (this._state === CB_STATE.OPEN) {
      const elapsed  = Date.now() - this._openedAt;
      const remaining = this.openTimeoutMs - elapsed;

      if (remaining > 0) {
        const err = Object.assign(
          new Error(`[${this.name}] Service unavailable — circuit OPEN, retry in ${Math.ceil(remaining / 1000)}s`),
          { code: 'CIRCUIT_OPEN', status: 503 }
        );
        throw err;
      }

      // Cooldown elapsed → probe
      this._halfOpen();
    }

    if (this._state === CB_STATE.HALF_OPEN) {
      if (this._halfOpenLock) {
        throw Object.assign(
          new Error(`[${this.name}] Circuit HALF_OPEN — probe in progress, try again shortly`),
          { code: 'CIRCUIT_PROBE_BUSY', status: 503 }
        );
      }
      this._halfOpenLock = true;
    }

    // ── Execute ────────────────────────────────────────────────────
    try {
      const result = await fn();
      this._recordSuccess();
      return result;
    } catch (err) {
      this._recordFailure(err);
      throw err;
    } finally {
      // Release probe lock regardless of outcome (state may have changed)
      if (this._state === CB_STATE.HALF_OPEN) {
        this._halfOpenLock = false;
      }
    }
  }

  /**
   * Snapshot of circuit breaker state — for health/debug endpoints.
   * @returns {object}
   */
  snapshot() {
    const msUntilRetry = this._state === CB_STATE.OPEN
      ? Math.max(0, this.openTimeoutMs - (Date.now() - this._openedAt))
      : null;

    return {
      state         : this._state,
      failureCount  : this._failureCount,
      successCount  : this._successCount,
      openedAt      : this._openedAt ? new Date(this._openedAt).toISOString() : null,
      msUntilRetry,
      config        : {
        failureThreshold: this.failureThreshold,
        successThreshold: this.successThreshold,
        openTimeoutMs   : this.openTimeoutMs,
      },
    };
  }

  /** Manually reset (useful in tests). */
  reset() {
    this._state        = CB_STATE.CLOSED;
    this._failureCount = 0;
    this._successCount = 0;
    this._openedAt     = null;
    this._halfOpenLock = false;
  }
}

// Singleton — one circuit breaker for all Adzuna calls in this process
const circuitBreaker = new CircuitBreaker({ name: 'Adzuna' });

// ─── Layer 1: Timeout ────────────────────────────────────────────────────────

/**
 * Single HTTPS GET with a hard timeout.
 * Destroys the socket and rejects with code=TIMEOUT if the deadline passes.
 *
 * @param {string} url
 * @param {number} [timeoutMs]
 * @returns {Promise<object>}
 */
function fetchWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let settled = false;

    // Pass the keep-alive agent so TCP connections are reused
    const req = https.get(url, { agent: httpsAgent }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        try {
          const data = JSON.parse(raw);
          if (res.statusCode >= 400) {
            return reject(
              Object.assign(
                new Error(data?.exception || `Adzuna HTTP ${res.statusCode}`),
                { status: res.statusCode }
              )
            );
          }
          resolve(data);
        } catch {
          reject(new Error('Adzuna response is not valid JSON'));
        }
      });
    });

    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      req.destroy();
      reject(
        Object.assign(
          new Error(`Adzuna request timed out after ${timeoutMs}ms`),
          { code: 'TIMEOUT', status: 504 }
        )
      );
    }, timeoutMs);
  });
}

// ─── Layer 2: Retry + Exponential Backoff ────────────────────────────────────

/**
 * Returns true for errors that should be retried.
 * 4xx errors (client mistakes) are NOT retried.
 */
function isRetryable(err) {
  if (err.code === 'TIMEOUT')   return true;  // timed out
  if (err.code === 'ECONNRESET') return true; // connection reset
  if (err.code === 'ENOTFOUND') return false; // DNS failure — don't retry
  if (!err.status)              return true;  // network-level error
  return err.status >= 500;                   // 5xx server errors
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Fetch with automatic retry on transient failures.
 * Uses exponential backoff with random jitter.
 *
 * Attempt schedule (defaults):
 *   Attempt 1 — immediately
 *   Attempt 2 — ~400ms  (base * 2^0 + jitter)
 *   Attempt 3 — ~800ms  (base * 2^1 + jitter)
 *
 * @param {string} url
 * @param {number} [maxRetries]
 * @returns {Promise<object>}
 */
async function fetchWithRetry(url, maxRetries = MAX_RETRIES) {
  let lastErr;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchWithTimeout(url);
    } catch (err) {
      lastErr = err;

      const isLast = attempt === maxRetries;
      if (!isRetryable(err) || isLast) throw err;

      // Exponential backoff: base * 2^attempt + random jitter (0–100ms)
      const backoffMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 100;
      console.warn(
        `[AdzunaClient] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${err.message}. ` +
        `Retrying in ${Math.round(backoffMs)}ms…`
      );
      await sleep(backoffMs);
    }
  }

  throw lastErr;
}

// ─── Layer 3: Circuit Breaker (outermost) ────────────────────────────────────

/**
 * Main entry point — fetch JSON from Adzuna with full resilience stack.
 *
 * Order: Circuit Breaker → Retry → Timeout
 *
 * @param {string} url
 * @returns {Promise<object>}
 * @throws {Error} 503 when circuit is OPEN or HALF_OPEN probe busy
 * @throws {Error} 504 on timeout (all retries exhausted)
 * @throws {Error} 4xx/5xx from Adzuna
 */
function fetchJSON(url) {
  console.log('[AdzunaClient] Fetching URL:', url);
  return circuitBreaker.execute(() => fetchWithRetry(url));
}

module.exports = {
  fetchJSON,
  circuitBreaker,   // exported for health/debug endpoints and tests
  CB_STATE,
};
