import { useProviders } from '../lib/useProviders.js';
import InstallHint from './InstallHint.jsx';

// Stands between an AI action and the person until a CLI can answer. The
// action renders only once one is found; before that the gate shows the
// probe, then the install hint, so no action ever has to handle the no-CLI
// case itself. Children is a function of the CLI state:
//
//   { providers, ready, checking, refresh }
//
// `ready` is the provider that will answer (for copy that names it),
// `providers` the whole list (for turning the start event's id into a name),
// `refresh` and `checking` the re-probe for the moment after an install.
export default function AiGate({ intro, children }) {
  const { providers, checking, refresh } = useProviders();

  if (providers === undefined) return <p className="font-mono text-xs text-muted">Checking for an AI CLI...</p>;
  const ready = providers.find((p) => p.present && p.runs);
  if (!ready) return <InstallHint intro={intro} providers={providers} checking={checking} onRecheck={refresh} />;
  return children({ providers, ready, checking, refresh });
}
