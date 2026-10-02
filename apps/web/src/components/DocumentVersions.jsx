import { useState } from 'react';
import { usePopover } from '../lib/usePopover.js';
import { shortStamp } from '../lib/time.js';
import { notifyError } from '../lib/toast.js';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import Chip from './ui/Chip.jsx';
import CountBadge from './ui/CountBadge.jsx';
import { DocumentIcon, HistoryIcon, PenIcon, SparkleIcon, UserIcon } from './Icon.jsx';

// Who wrote each kept version: the template's first draft, a chat change
// the person applied, a header brought up to date from their profile, or
// the person's own edit or restore.
const AUTHOR = {
  template: { word: 'First draft from the template', Icon: DocumentIcon, tone: 'bg-ink/5 text-muted' },
  ai: { word: 'Chat change you applied', Icon: SparkleIcon, tone: 'bg-primary/10 text-primary' },
  profile: { word: 'Header from your profile', Icon: UserIcon, tone: 'bg-ink/5 text-ink' },
  you: { word: 'Your edit', Icon: PenIcon, tone: 'bg-select text-ink' },
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
      <Button variant="quiet" size="sm" aria-expanded={open} onClick={() => setOpen(!open)} className="shrink-0 px-3 py-1.5 disabled:cursor-not-allowed">
        <HistoryIcon size={14} />
        Versions
        <CountBadge n={list.length} />
      </Button>
      {open && (
        <Card variant="pop" as="div" role="dialog" aria-label="Versions" className="pop-in absolute right-0 top-full z-30 mt-2 w-80 p-2">
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
                    <Chip tone="applied">Current</Chip>
                  ) : (
                    <Button
                      variant="quiet"
                      size="sm"
                      disabled={Boolean(busy)}
                      onClick={() => restore(version.at)}
                      className="px-2.5"
                    >
                      {busy === version.at ? 'Restoring...' : 'Restore'}
                    </Button>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      )}
    </div>
  );
}
