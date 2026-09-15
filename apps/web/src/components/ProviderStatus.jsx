// What got detected, by label and version, never a name typed in here: the
// providers endpoint is the one place that knows what JobDekho can drive.
export default function ProviderStatus({ providers }) {
  if (!providers.length) return null;
  const canBrowse = providers.filter((p) => p.policies.includes('web'));

  return (
    <div className="flex flex-col gap-2 text-sm">
      {providers.map((p) => (
        <div key={p.id} className="flex items-baseline gap-2">
          <span className="text-ink">{p.label}</span>
          <span className="text-muted">{status(p)}</span>
        </div>
      ))}
      <p className="mt-1 text-muted">{browseSentence(canBrowse, providers)}</p>
    </div>
  );
}

function status({ runs, version, error }) {
  if (runs) return version || 'installed';
  if (error) return error;
  return 'not installed';
}

// "Is this job real?" is the one action that browses, so it can only ever
// run on a CLI that honours the 'web' policy (see ai/policies.js).
function browseSentence(canBrowse, providers) {
  if (!canBrowse.length) return '"Is this job real?" needs a CLI that can browse the web; none of these can.';
  const can = canBrowse.map((p) => p.label).join(' or ');
  const rest = providers.filter((p) => !canBrowse.includes(p)).map((p) => p.label).join(' or ');
  return rest
    ? `"Is this job real?" needs a CLI that can browse the web, so it only ever runs on ${can}. ${rest} cannot be given that.`
    : `"Is this job real?" needs a CLI that can browse the web, so it only ever runs on ${can}.`;
}
