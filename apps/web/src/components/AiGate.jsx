import { Fragment } from 'react';
import { useProviders } from '../lib/useProviders.js';
import { providerFor } from '../lib/providerFor.js';
import InstallHint from './InstallHint.jsx';

// Stands between AI actions and the person until a CLI can answer them.
// Each action is a component taking { posting, cli } that also carries the
// tool policy its server-side twin runs under (`policy`) and a sentence for
// its own hint (`intro`). cli is:
//
//   { providers, ready, checking, refresh }
//
// `ready` is the CLI that will answer THAT action, for copy that names it,
// and it differs by action: Antigravity can take a no-tools action and not
// the fake check, and the server makes the same choice (ai/select.js).
// `providers` is the whole list (for turning the start event's id into a
// name), `refresh` and `checking` the re-probe for the moment after an
// install. When no action can run, one hint with the caller's intro stands
// for all of them; when only some can, each of the rest shows its own hint
// naming what would take it, so no action has to handle the no-CLI case
// itself.
export default function AiGate({ intro, posting, actions }) {
  const { providers, checking, refresh } = useProviders();

  if (providers === undefined) return <p className="font-mono text-xs text-muted">Checking for an AI CLI...</p>;
  const hint = (text, policies) => (
    <InstallHint intro={text} policies={policies} providers={providers} checking={checking} onRecheck={refresh} />
  );
  const ready = actions.map((Action) => providerFor(providers, Action.policy));
  if (!ready.some(Boolean)) return hint(intro, actions.map((Action) => Action.policy));
  return actions.map((Action, i) => (
    <Fragment key={i}>
      {ready[i]
        ? <Action posting={posting} cli={{ providers, ready: ready[i], checking, refresh }} />
        : hint(Action.intro, [Action.policy])}
    </Fragment>
  ));
}
