import { req } from './request.js';

// The first-run setup check: [{ id, label, state, detail, fix }], state
// 'ok', 'missing' or 'optional' (see the server's setup/checks.js). Not
// announced as a toast on failure, unlike the providers read: the Settings
// card says so in place, and the Postings notice simply stays away, since a
// banner about a check that could not run would only be noise. `refresh`
// re-probes the AIs, the way "Check again" does for the providers.
export function getSetup({ refresh = false } = {}) {
  return req(`/api/setup${refresh ? '?refresh=true' : ''}`).then((d) => d.checks);
}
