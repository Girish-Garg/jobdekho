import { getProviders } from '../api.js';
import { notify } from './toast.js';

// Only these two kinds name a fix a button can actually attempt from the
// browser: a missing CLI and a signed-out one both start with checking
// again, since the real fix (install it, sign into it) happens outside the
// browser entirely (see apps/server/src/ai/errors.js for what each kind
// means, and toast.js for why a LatexError never reaches here).
const RECHECKABLE = ['not_found', 'login'];

export function canRecheck(kind) {
  return RECHECKABLE.includes(kind);
}

// Re-probes the CLIs the server can see and reports what it found. Detached
// from any one screen's useProviders(): a toast can outlive the panel that
// raised it, so this asks the server directly rather than reaching into a
// hook instance that may already be unmounted. It does not confirm a sign-in
// specifically - the probe only checks that a CLI still runs - but it is the
// same next step this app already offers everywhere else a CLI goes missing.
export async function recheckProviders() {
  const providers = await getProviders({ refresh: true });
  const found = providers.filter((p) => p.runs).map((p) => p.label);
  notify({
    kind: 'done',
    title: 'Checked again',
    detail: found.length ? `Found: ${found.join(', ')}.` : 'Still nothing installed that runs.',
  });
  return providers;
}
