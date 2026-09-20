import { send } from '../lib/request.js';
import { notifyError } from '../lib/toast.js';

// One place decides what a JSON call means: a 204 is nothing, anything else
// is its body. Every module in this folder is a thin naming of endpoints on
// top of it (see lib/request.js for the rules a response goes through).
export async function req(url, opts) {
  const res = await send(url, opts);
  return res.status === 204 ? null : res.json();
}

// A handful of GET endpoints are read from more than one screen, several of
// which fall back to an empty list or a blank record on failure with no way
// for the person to know their own data did not load (Shell.jsx's filter
// load and useProviders.js's probe are the two named in the audit that led
// here). Wrapping the read here announces it once, whichever local fallback
// the caller then applies.
export function announced(promise, title) {
  return promise.catch((err) => {
    notifyError(err, title);
    throw err;
  });
}
