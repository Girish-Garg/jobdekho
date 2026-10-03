// One round trip to the server, with the two rules every endpoint shares:
// the session cookie always goes along, and a failed response becomes an
// Error carrying the server's own words.

// The server's error strings are sentences written to be shown verbatim, so
// they become the message rather than a status line. `kind` rides along when
// an AI call names which action fixes it (see apps/server/src/ai/errors.js),
// so a screen can offer the matching button without parsing prose.
// `problems` rides along too: the LaTeX guard's list of lines it refused
// (see the server's resume/guard), which a document screen lists under the
// sentence rather than folding into it. `busy` rides along on the 409 a chat
// gets while another AI call runs: which chat holds it, so the asking chat
// can say where and link to it (see the server's chat/busy.js).
export function failure(body, fallback, status) {
  const err = new Error(body?.error || fallback);
  if (status) err.status = status;
  if (body?.kind) err.kind = body.kind;
  if (body?.busy) err.busy = body.busy;
  if (Array.isArray(body?.problems)) err.problems = body.problems.filter((p) => typeof p === 'string');
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
    // The resume upload's 422 carries a message written to be shown to the
    // user verbatim, so prefer the server's words to a status line.
    const body = await res.json().catch(() => null);
    throw failure(body, `${opts.method || 'GET'} ${url} -> ${res.status}`, res.status);
  }
  return res;
}
