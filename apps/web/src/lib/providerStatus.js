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

// "Is this job real?" is the one job action that searches the web, so it can
// only run on a CLI that honours the 'web' policy (see ai/policies.js).
export function webSentence(providers) {
  const canSearch = providers.filter(searchesWeb);
  if (!canSearch.length) return '"Is this job real?" needs a CLI that can search the web; none of these can.';
  const can = canSearch.map((p) => p.label).join(' and ');
  const rest = providers.filter((p) => !canSearch.includes(p)).map((p) => p.label).join(' or ');
  const intro = `"Is this job real?" searches the web, which ${can} ${canSearch.length > 1 ? 'can both' : 'can'} do.`;
  return rest ? `${intro} ${rest} cannot.` : intro;
}
