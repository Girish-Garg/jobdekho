import { Fragment } from 'react';

// Why a CLI that is installed and runs still cannot take an action, by
// policy and then by CLI. One pair exists today. Measured on agy 1.1.22:
// headless mode auto-denies every permission-gated tool, and the only way
// to allow one is a permanent rule in the person's own global settings,
// which JobDekho will not write, so it is never handed a web action.
const CANNOT = {
  web: {
    agy: 'this action needs a CLI that can browse, and Antigravity\'s headless mode cannot be given '
      + 'web access without permanent allow-rules in its own config',
  },
};

const serves = (p, policies) => policies.some((policy) => p.policies.includes(policy));
const reasonFor = (p, policies) => policies.map((policy) => CANNOT[policy]?.[p.id]).find(Boolean) ?? 'it cannot take this action';

// Shown in place of an AI button when no installed CLI can take the action.
// A button that can only fail teaches nothing; the install links and a
// re-check are the two things that get the person unstuck. `policies` are
// the tool policies the actions behind this hint need, which decides which
// CLIs are worth installing and which would not help however well they run.
// An installed CLI that will not run, or must not be used, carries the
// server's sentence about why, which goes up verbatim. The intro names the
// action that was about to run, since the hint stands where its button
// would have been.
export default function InstallHint({ intro, policies, providers, checking, onRecheck }) {
  const fit = providers.filter((p) => serves(p, policies));
  const stuck = fit.filter((p) => p.present);
  const absent = fit.filter((p) => !p.present);
  const unfit = providers.filter((p) => !serves(p, policies));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4">
      <p className="text-sm text-ink">{intro}</p>
      {providers.length === 0 && (
        <p role="alert" className="text-sm text-ember">
          Could not check which AI CLIs are installed. Check again once the server is back.
        </p>
      )}
      {stuck.map((p) => <p key={p.id} className="text-sm text-ink">{p.error}</p>)}
      {absent.length > 0 && (
        <p className="text-sm text-ink">
          Install{' '}
          {absent.map((p, i) => (
            <Fragment key={p.id}>
              {i > 0 && ' or '}
              {p.label} from <a href={p.install} target="_blank" rel="noreferrer" className="underline">{p.install}</a>
            </Fragment>
          ))}
          , then check again. If it is still not found, restart JobDekho so it picks up the new PATH.
        </p>
      )}
      {unfit.map((p) => (
        <p key={p.id} className="text-sm text-ink">
          {p.present && p.runs
            ? `${p.label} is installed, but ${reasonFor(p, policies)}.`
            : `${p.label} would not help here: ${reasonFor(p, policies)}.`}
        </p>
      ))}
      <div>
        <button
          type="button"
          disabled={checking}
          onClick={onRecheck}
          className="rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-ink disabled:opacity-60"
        >
          {checking ? 'Checking...' : 'Check again'}
        </button>
      </div>
    </div>
  );
}
