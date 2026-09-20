import { useState } from 'react';
import { usePostingAction, versionsOf } from '../lib/usePostingAction.js';
import { relativeDay } from '../lib/time.js';
import AiError from './AiError.jsx';
import AiRefine from './AiRefine.jsx';
import AiVersions from './AiVersions.jsx';
import ResumeTailorResult from './ResumeTailorResult.jsx';
import ResumeBuilderOverlay from './ResumeBuilderOverlay.jsx';

const SECONDARY = 'rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-ink disabled:opacity-60';

// "Tailor my resume for this job": sends the career record and the posting
// to the CLI with no tools, and shows the plan it picked behind the server's
// own fact check of it. A saved plan collapses to one line naming whether
// anything needs checking, so a page carrying all three AI results does not
// have to show three full results at once; a click opens it back up, and a
// fresh run opens it back up too, since the person who just asked for it
// wants to read it. The button becomes "Tailor again", so a posting already
// tailored for never costs a second call by accident. While a CLI that went
// missing is being reported, the button is withheld: it could only fail, and
// the alert offers the re-probe.
export default function ResumeTailor({ posting, cli }) {
  const { saved, busy, progress, error, run, refine, clearError } = usePostingAction({
    postingId: posting.id, kind: 'resume-tailor', providers: cli.providers,
    noun: 'Career record', doing: 'picking your best entries',
  });
  const [expanded, setExpanded] = useState(false);
  // Which version is on screen; null means the newest, so a fresh run or
  // refine shows what it just produced without this having to track length.
  const [selected, setSelected] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  if (saved === undefined) return <p className="font-mono text-xs text-muted">Looking for an earlier rewrite...</p>;
  const blocked = error?.kind === 'not_found';
  const flagCount = saved?.result?.factCheck?.flags?.length ?? 0;
  const summary = saved
    && `Tailored ${relativeDay(saved.createdAt)}, ${flagCount ? `${flagCount} to check` : 'nothing flagged'}`;
  const versions = versionsOf(saved);
  const shown = saved && versions[selected ?? versions.length - 1];

  function onRun() {
    setExpanded(true);
    setSelected(null);
    run();
  }

  function onRefine(instruction) {
    setExpanded(true);
    setSelected(null);
    refine(instruction);
  }

  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      {!saved && (
        <p className="text-xs leading-relaxed text-muted">
          Sends your career record and this posting to {cli.ready.label} on this computer, with no tools.
          Takes a minute or two. It picks and reorders your best entries for this job, then rewords the
          bullets it keeps; every reworded bullet is checked against that entry's own original before you see it.
        </p>
      )}
      {saved && (
        <details className="group" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
            <span className="text-sm text-ink">{summary}</span>
            <span aria-hidden="true" className="shrink-0 text-muted transition-transform group-open:rotate-180">&#8964;</span>
          </summary>
          <div className="mt-2 flex flex-col gap-3">
            <ResumeTailorResult record={shown} providers={cli.providers} onOpenBuilder={() => setBuilderOpen(true)} />
            <AiVersions record={saved} selected={selected} onSelect={setSelected} />
            {!blocked && <AiRefine label={cli.ready.label} busy={busy} onRefine={onRefine} />}
          </div>
        </details>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {!blocked && (
          <button type="button" disabled={busy} onClick={onRun} className={SECONDARY}>
            {busy ? 'Tailoring...' : saved ? 'Tailor again' : 'Tailor my resume for this job'}
          </button>
        )}
        <span aria-live="polite" className="text-sm text-muted">{busy ? progress : ''}</span>
      </div>
      <AiError error={error} checking={cli.checking} onRecheck={() => (clearError(), cli.refresh())} />
      {builderOpen && shown && (
        <ResumeBuilderOverlay jobTitle={posting.title} plan={shown.result} onClose={() => setBuilderOpen(false)} />
      )}
    </div>
  );
}

// The tool policy its server-side twin runs under, and the sentence the gate
// shows when no installed CLI can take it (see AiGate).
ResumeTailor.policy = 'none';
ResumeTailor.intro = 'Tailoring your resume asks an AI CLI installed on this computer, on your own subscription.';
