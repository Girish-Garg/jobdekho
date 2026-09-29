import GuardProblems from './GuardProblems.jsx';
import { CodeIcon, WarningIcon } from './Icon.jsx';

// Why there is no PDF, by kind (see the server's documents/pdf.js and
// resume/errors.js), with the server's sentence as written. What to do
// differs by kind, so the buttons do: a refused or broken source is fixed
// in the source (or by the chat), a missing LaTeX by installing one, and a
// slow or failed build by trying again.
const TITLE = {
  unsafe: 'The LaTeX guard refused this source',
  not_found: 'LaTeX is not installed on this computer',
  compile_failed: 'The document did not compile',
  timeout: 'The compile took too long',
  failed: 'The PDF could not be built',
};

const PRIMARY = 'inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary transition duration-fast ease hover:brightness-110';
const QUIET = 'inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink transition-colors duration-fast ease hover:border-edge';

export default function CompileFailure({ failure, onOpenSource, onRetry }) {
  const kind = TITLE[failure.kind] ? failure.kind : 'failed';
  const fixable = kind === 'unsafe' || kind === 'compile_failed';
  const sourceButton = <button type="button" onClick={onOpenSource} className={QUIET}><CodeIcon size={14} />Open the source</button>;

  if (kind === 'unsafe') {
    return (
      <div className="mx-auto mt-6 flex max-w-xl flex-col gap-3">
        <GuardProblems title={TITLE.unsafe} problems={failure.problems ?? []}>
          <p className="pl-6 text-sm text-ink/85">{failure.message}</p>
        </GuardProblems>
        <div className="flex flex-wrap items-center gap-3">{sourceButton}<span className="text-xs text-muted">or ask the chat to fix the lines listed.</span></div>
      </div>
    );
  }

  return (
    <section role="alert" aria-label={TITLE[kind]} className="mx-auto mt-6 flex max-w-xl flex-col gap-3 rounded-2xl border border-ember/25 bg-panel p-6 shadow-raise">
      <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-ember/10 text-ember"><WarningIcon size={18} /></span>
      <h3 className="font-display text-lg font-bold text-ink">{TITLE[kind]}</h3>
      <p className="text-sm leading-relaxed text-ink/85">{failure.message}</p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {kind === 'not_found' && (
          <a href="https://miktex.org/download" target="_blank" rel="noreferrer" className={PRIMARY}>Get MiKTeX</a>
        )}
        {fixable ? sourceButton : <button type="button" onClick={onRetry} className={QUIET}>Try again</button>}
      </div>
      {kind === 'not_found' && (
        <p className="text-xs text-muted">Install it with the default options, then press Try again. Download .tex works without it.</p>
      )}
    </section>
  );
}
