import { Fragment } from 'react';
import { useSetup } from '../lib/useSetup.js';
import SettingsCard from './SettingsCard.jsx';
import { CheckIcon, WarningIcon } from './Icon.jsx';

// What JobDekho needs on this computer, one row per check the server ran
// (see its setup/checks.js), in its order: the required ones, then the two
// that are nice to have. A row that is not ok carries the server's one
// sentence on what to do. Saffron marks what still needs doing, since it
// asks the person to act; green what is done; muted what is optional.
const TONE = {
  ok: { word: 'Ready', chip: 'bg-applied/15 text-applied', text: 'text-applied', icon: <CheckIcon size={11} /> },
  missing: { word: 'Needed', chip: 'bg-primary/15 text-primary', text: 'text-primary', icon: <WarningIcon size={11} /> },
  optional: { word: 'Optional', chip: 'bg-select text-muted', text: 'text-muted', icon: <span className="h-1.5 w-1.5 rounded-full bg-muted/60" /> },
};

// The fix sentences carry their links as bare URLs ("Install MiKTeX from
// https://miktex.org/download on Windows, ..."), cut out here to become real
// links. The sentence's own comma or full stop after one is not part of it.
const URL_PATTERN = /(https?:\/\/[^\s"]*[^\s".,;:)'])/;

function Linked({ text }) {
  return String(text).split(URL_PATTERN).map((part, i) => (i % 2
    ? <a key={i} href={part} target="_blank" rel="noreferrer" className="font-medium text-ink underline decoration-edge underline-offset-2 transition-colors duration-fast ease hover:decoration-ink">{part}</a>
    : <Fragment key={i}>{part}</Fragment>));
}

function Row({ check }) {
  const tone = TONE[check.state] ?? TONE.optional;
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <span aria-hidden="true" className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${tone.chip}`}>{tone.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-sm font-semibold text-ink">{check.label}</span>
          <span className={`text-xs font-semibold ${tone.text}`}>{tone.word}</span>
        </p>
        <p className="mt-0.5 break-words text-sm text-muted">{check.detail}</p>
        {check.state !== 'ok' && check.fix && (
          <p className="mt-1 break-words text-sm text-ink"><Linked text={check.fix} /></p>
        )}
      </div>
    </li>
  );
}

function Summary({ checks }) {
  if (!checks) return null;
  const todo = checks.filter((c) => c.state === 'missing').length;
  if (!todo) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-applied"><CheckIcon size={12} /> All set</span>;
  return <span className="text-xs font-semibold text-primary">{todo} to do</span>;
}

// "Check again" re-probes the AIs, the same refresh InstallHint's own
// "Check again" asks for; LaTeX, the profile and the postings are read
// fresh on every load anyway. Placed in Settings (see SettingsView.jsx).
export default function SetupCard() {
  const { checks, checking, refresh } = useSetup();
  return (
    <SettingsCard
      icon={<CheckIcon size={18} />}
      title="Setup check"
      hint="What JobDekho needs on this computer, checked without asking any AI."
      note={<span aria-live="polite" className="shrink-0 pt-1"><Summary checks={checks} /></span>}
    >
      {checks === undefined && <p className="text-sm text-muted">Looking at this computer...</p>}
      {checks === null && (
        <p role="alert" className="text-sm text-ember">Could not run the setup check. Check again once the server is back.</p>
      )}
      {checks && <ul className="divide-y divide-line">{checks.map((c) => <Row key={c.id} check={c} />)}</ul>}
      <button
        type="button"
        disabled={checking}
        onClick={refresh}
        className="btn btn-quiet mt-5 font-normal"
      >
        {checking ? 'Checking...' : 'Check again'}
      </button>
    </SettingsCard>
  );
}
