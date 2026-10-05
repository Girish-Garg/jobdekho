import { REPO_URL } from '../lib/project.js';
import { errorLine } from '../lib/errorReport.js';
import Button from './ui/Button.jsx';
import CopyDetailsButton from './CopyDetailsButton.jsx';
import { WarningIcon } from './Icon.jsx';

// A page that could not be drawn, or the whole app (`full`), in the failure
// card the PDF page uses (CompileFailure.jsx), the look the owner picked for
// every fallback. Reloading is the way out a person can always take; the
// error's own line and the details to copy are for reporting it.
const ISSUES = `${REPO_URL}/issues/new`;

export default function BrokenScreen({ title, body, error, report, full = false }) {
  const card = (
    <section role="alert" aria-label={title} className="mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-ember/25 bg-panel p-6 shadow-raise">
      <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-ember/10 text-ember"><WarningIcon size={18} /></span>
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <p className="text-sm leading-relaxed text-ink/85">{body}</p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button variant="primary" className="px-4 py-2" onClick={() => window.location.reload()}>Reload JobDekho</Button>
        <CopyDetailsButton text={report} label="Copy error details" className="px-4 py-2" />
      </div>
      <p className="break-words rounded-lg bg-select/60 px-3 py-2 font-mono text-xs leading-relaxed text-muted">{errorLine(error)}</p>
      <p className="text-xs text-muted">
        If it keeps happening, paste the details into an issue on{' '}
        <a href={ISSUES} target="_blank" rel="noreferrer" className="link">GitHub</a>.
      </p>
    </section>
  );
  // The whole app gone, the card is the screen; a page gone, the top bar and
  // the chat are still there around it.
  if (full) return <div className="app-canvas grid h-full w-full place-items-center overflow-y-auto p-6">{card}</div>;
  return <div className="px-4 py-10">{card}</div>;
}
