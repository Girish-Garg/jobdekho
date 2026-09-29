// What got detected, by label and version, never a name typed in here: the
// providers endpoint is the one place that knows what JobDekho can drive.
export default function ProviderStatus({ providers }) {
  if (!providers.length) return null;
  const canSearch = providers.filter((p) => p.policies.includes('web'));

  return (
    <div className="flex flex-col gap-2 text-sm">
      {providers.map((p) => (
        <div key={p.id} className="flex items-baseline gap-2">
          <span className="text-ink">{p.label}</span>
          <span className="text-muted">{status(p)}</span>
        </div>
      ))}
      <p className="mt-1 text-muted">{webSentence(canSearch, providers)}</p>
    </div>
  );
}

function status({ runs, version, error }) {
  if (runs) return version || 'installed';
  if (error) return error;
  return 'not installed';
}

// "Is this job real?" is the one action that searches the web, so it can
// only run on a CLI that honours the 'web' policy (see ai/policies.js).
function webSentence(canSearch, providers) {
  if (!canSearch.length) return '"Is this job real?" needs a CLI that can search the web; none of these can.';
  const can = canSearch.map((p) => p.label).join(' and ');
  const rest = providers.filter((p) => !canSearch.includes(p)).map((p) => p.label).join(' or ');
  const intro = `"Is this job real?" searches the web, which ${can} ${canSearch.length > 1 ? 'can both' : 'can'} do.`;
  return rest ? `${intro} ${rest} cannot.` : intro;
}
