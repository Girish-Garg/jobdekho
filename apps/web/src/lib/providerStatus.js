// What the probe found for one CLI, as a tone for its dot and the words
// beside it: the version once it runs, the probe's own sentence when it is
// installed but stuck, and "not installed" when there is nothing to run.
// Never a name typed in here: the providers endpoint is the one place that
// knows what JobDekho can drive.
export function providerState({ runs, version, error }) {
  if (runs) return { tone: 'ready', text: version || 'installed' };
  if (error) return { tone: 'stuck', text: error };
  return { tone: 'missing', text: 'not installed' };
}

export const searchesWeb = (provider) => (provider.policies || []).includes('web');

// "A", "A and B", "A, B and C".
function listed(labels) {
  if (labels.length < 3) return labels.join(' and ');
  return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;
}

const TOGETHER = { 1: 'can', 2: 'can both' };

// "Is this job real?" is the one job action that searches the web, so it can
// only run on a CLI that honours the 'web' policy (see ai/policies.js). The
// providers endpoint says which do right now: Ollama only once its probe
// found it can search (signed in, with a model that uses tools), so until
// then it is the one named as unable, and its card says how to change that.
export function webSentence(providers) {
  const canSearch = providers.filter(searchesWeb);
  if (!canSearch.length) return '"Is this job real?" needs a CLI that can search the web; none of these can.';
  const rest = providers.filter((p) => !canSearch.includes(p)).map((p) => p.label);
  const intro = `"Is this job real?" searches the web, which ${listed(canSearch.map((p) => p.label))} ${TOGETHER[canSearch.length] ?? 'can all'} do.`;
  if (!rest.length) return intro;
  return rest.length === 1 ? `${intro} ${rest[0]} cannot.` : `${intro} Neither ${rest.join(' nor ')} can.`;
}
