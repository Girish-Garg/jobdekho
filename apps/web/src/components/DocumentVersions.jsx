import { useState } from 'react';
import { usePopover } from '../lib/usePopover.js';
import { shortStamp } from '../lib/time.js';
import { notifyError } from '../lib/toast.js';
import { TOOL } from './DocumentToolButton.jsx';
import { DocumentIcon, HistoryIcon, PenIcon, SparkleIcon } from './Icon.jsx';

// Who wrote each kept version: the template's first draft, a chat change
// the person applied, or the person's own edit or restore.
const AUTHOR = {
  template: { word: 'First draft from the template', Icon: DocumentIcon, tone: 'bg-ink/5 text-muted' },
  ai: { word: 'Chat change you applied', Icon: SparkleIcon, tone: 'bg-primary/10 text-primary' },
  you: { word: 'Your edit', Icon: PenIcon, tone: 'bg-accent/10 text-accent' },
};

const describe = (version) => (version.restoredFrom
  ? `Restored from ${shortStamp(version.restoredFrom)}`
  : (AUTHOR[version.by] ?? AUTHOR.you).word);

// The history, newest first. A restore brings an old text back as the
// newest version rather than rewinding, so nothing after it is lost and
// undoing a restore is one more restore (see the server's store).
export default function DocumentVersions({ versions, onRestore }) {
  const { open, setOpen, ref } = usePopover();
  const [busy, setBusy] = useState(null);
  const list = [...(versions ?? [])].reverse();

  async function restore(at) {
    setBusy(at);
    try {
      await onRestore(at);
    } catch (err) {
      notifyError(err, 'Could not restore that version');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={TOOL}>
        <HistoryIcon size={14} />
        Versions
        <span className="tnum rounded-full bg-select px-1.5 text-[11px] font-semibold text-muted">{list.length}</span>
      </button>
      {open && (
        <div role="dialog" aria-label="Versions" className="absolute right-0 top-full z-30 mt-2 w-80 rounded-2xl border border-line bg-overlay p-2 shadow-pop">
          <p className="px-2 pb-2 pt-1 text-xs text-muted">Restoring one adds it back as the newest version, so nothing is lost.</p>
          <ol className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
            {list.map((version, i) => {
              const { Icon, tone } = AUTHOR[version.by] ?? AUTHOR.you;
              return (
                <li key={version.at} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-select/50">
                  <span aria-hidden="true" className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${tone}`}><Icon size={13} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{describe(version)}</span>
                    <span className="block text-xs text-muted">{shortStamp(version.at)}</span>
                  </span>
                  {i === 0 ? (
                    <span className="rounded-full bg-applied/15 px-2 py-0.5 text-[11px] font-semibold text-applied">Current</span>
                  ) : (
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => restore(version.at)}
                      className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink transition-colors duration-fast ease hover:border-primary/40 hover:text-primary disabled:opacity-50"
                    >
                      {busy === version.at ? 'Restoring...' : 'Restore'}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
