import { useState } from 'react';
import Select from './Select.jsx';
import TrackerHistory from './TrackerHistory.jsx';
import { STAGES, STAGE_WORD, latestLine, when, followUpDue, followUpText } from '../lib/trackerStages.js';
import { startChatDraft } from '../lib/chatDraftSignal.js';
import { notifyError } from '../lib/toast.js';
import { ChevronDownIcon, MailIcon } from './Icon.jsx';

// One application: who and what, the latest thing that happened, and the
// stage, changed right here. A mail with no answer for a few days offers a
// follow-up, which starts the request in the chat for the person to send.
export default function TrackerRow({ entry, onUpdate, onRemove }) {
  const [open, setOpen] = useState(false);
  const latest = latestLine(entry);
  const due = followUpDue(entry);
  const update = (patch) => onUpdate(entry.id, patch).catch((err) => notifyError(err, 'Could not change it'));

  return (
    <li className="border-t border-line px-4 py-3 first:border-t-0">
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.7fr)_9.5rem] sm:gap-4">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`${entry.company} history`} className="flex min-w-0 items-start gap-2 text-left">
          <ChevronDownIcon size={14} className={`mt-1 shrink-0 text-muted transition-transform ${open ? '' : '-rotate-90'}`} />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{entry.company}</span>
            <span className="block truncate text-sm text-muted">{entry.role || 'No role given'}</span>
          </span>
        </button>
        <div className="min-w-0 text-sm">
          <p className="truncate text-ink">{latest.text}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>{when(latest.at)}{entry.postingId ? ', from a JobDekho posting' : ''}</span>
            {due && (
              <button type="button" onClick={() => startChatDraft(followUpText(entry))} className="flex items-center gap-1 font-medium text-primary hover:underline">
                <MailIcon size={11} />No reply yet. Write a follow-up
              </button>
            )}
          </p>
        </div>
        <Select block aria-label={`Stage for ${entry.company}`} className="field cursor-pointer py-1.5 text-sm" value={entry.stage} onChange={(e) => update({ stage: e.target.value })}>
          {STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_WORD[stage]}</option>)}
        </Select>
      </div>
      {open && <TrackerHistory entry={entry} onNote={(note) => update({ note })} onRemove={() => onRemove(entry.id).catch((err) => notifyError(err, 'Could not remove it'))} />}
    </li>
  );
}
