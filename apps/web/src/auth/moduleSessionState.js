// Pure session coordinator: testable without a browser, UI or persistent storage.
export function createSessionCoordinator(readCoreToken) {
  let generation = 0, cached = null, flight = null, controller = null;
  const fresh = dto => Number.isFinite(Date.parse(dto?.expiresAt)) && Date.parse(dto.expiresAt) > Date.now() + 1000;
  function clear() {
    const old = cached?.dto; generation++; controller?.abort(); controller = null; cached = null; flight = null; return old;
  }
  function run(key, work) {
    if (cached?.key === key && fresh(cached.dto)) return Promise.resolve(cached.dto);
    if (flight?.key === key) return flight.promise;
    clear(); const version = generation, token = readCoreToken(); controller = new AbortController(); const signal = controller.signal;
    const check = () => { if (version !== generation || signal.aborted || token !== readCoreToken()) throw new DOMException('Session changed', 'AbortError'); };
    const promise = (async () => { const dto = await work(signal, check); check(); if (!fresh(dto)) throw new Error('Module session expired. Reconnect to continue.'); cached = { key, dto }; return dto; })()
      .finally(() => { if (generation === version) flight = null; });
    flight = { key, promise }; return promise;
  }
  return { clear, run };
}
