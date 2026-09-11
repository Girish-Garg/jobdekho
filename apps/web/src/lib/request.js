// One round trip to the server, with the two rules every endpoint shares:
// the session cookie always goes along, and a failed response becomes an
// Error carrying the server's own words.

// The server's error strings are sentences written to be shown verbatim, so
// they become the message rather than a status line. `kind` rides along when
// an AI call names which action fixes it (see apps/server/src/ai/errors.js),
// so a screen can offer the matching button without parsing prose.
export function failure(body, fallback, status) {
  const err = new Error(body?.error || fallback);
  if (status) err.status = status;
  if (body?.kind) err.kind = body.kind;
  return err;
}

export async function send(url, opts = {}) {
  // The JSON content-type only goes on calls that actually send JSON: a
  // FormData body needs the browser to write the multipart boundary into the
  // header itself, and a bodyless POST that claims to carry JSON is a 400 at
  // the server's parser.
  const headers = typeof opts.body === 'string' ? { 'content-type': 'application/json' } : undefined;
  const res = await fetch(url, { credentials: 'include', headers, ...opts });
  if (res.status === 401) throw failure(null, 'unauthorized', 401);
  if (!res.ok) {
    // The resume 422s and the apply-filter 400 carry messages written to be
    // shown to the user verbatim, so prefer the server's words to a status line.
    const body = await res.json().catch(() => null);
    throw failure(body, `${opts.method || 'GET'} ${url} -> ${res.status}`, res.status);
  }
  return res;
}
