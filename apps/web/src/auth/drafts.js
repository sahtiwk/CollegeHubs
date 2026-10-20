// Tab-local recovery only. No credentials; drafts are scoped to account, Hub and resource.
const PREFIX = 'ch_draft:', TTL = 86400000;
export function readDraft(key) {
  try {
    const row = JSON.parse(sessionStorage.getItem(PREFIX + key));
    if (row && row.until > Date.now()) return row.value;
    sessionStorage.removeItem(PREFIX + key);
  } catch { /* Unavailable storage must not prevent editing. */ }
  return null;
}
export function writeDraft(key, value) {
  try {
    for (const name of Object.keys(sessionStorage).filter(k => k.startsWith(PREFIX))) {
      try { if (JSON.parse(sessionStorage.getItem(name)).until <= Date.now()) sessionStorage.removeItem(name); } catch { sessionStorage.removeItem(name); }
    }
    if (value === null) sessionStorage.removeItem(PREFIX + key);
    else {
      const text = JSON.stringify({ until: Date.now() + TTL, value });
      if (text.length <= 150000) sessionStorage.setItem(PREFIX + key, text);
      const keys = Object.keys(sessionStorage).filter(k => k.startsWith(PREFIX));
      while (keys.length > 30) sessionStorage.removeItem(keys.shift());
    }
  } catch { /* Best effort; current editor state remains authoritative. */ }
}
