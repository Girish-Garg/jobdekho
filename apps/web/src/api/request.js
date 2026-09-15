import { send } from '../lib/request.js';

// One place decides what a JSON call means: a 204 is nothing, anything else
// is its body. Every module in this folder is a thin naming of endpoints on
// top of it (see lib/request.js for the rules a response goes through).
export async function req(url, opts) {
  const res = await send(url, opts);
  return res.status === 204 ? null : res.json();
}
