import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import IconButton from './ui/IconButton.jsx';
import TrackerDetailBody from './TrackerDetailBody.jsx';
import { startChatDraft } from '../lib/chatDraftSignal.js';
import { CloseIcon, MailIcon } from './Icon.jsx';

// What to start in the chat to mail about this one: its contact when it has
// one, else a request with the address left for the person to type.
function mailDraft(entry) {
  const about = [entry.role, entry.company].filter(Boolean).join(' at ');
  if (entry.contact?.email) return `Email ${entry.contact.email} about ${about}: `;
  return `Email someone at ${entry.company}${entry.role ? ` about ${entry.role}` : ''}. Their address: `;
}

// Who "Not a job" will stop filing, said before it does: the sender's own
// domain, or the company when its mail came through a hiring system.
function notJobScope(entry) {
  const own = entry.events.find((event) => event.mailId && ['company', 'marketing'].includes(event.via))?.sender;
  return own ? `mail from ${own}` : `mail about ${entry.company}`;
}

// The open application as a sidebar: the full height of the window under
// the top bar, at its right edge, over the board rather than beside it, so
// opening one moves nothing. Its header and its buttons stay put while the
// middle scrolls (see TrackerDetailBody.jsx). Esc closes it. Drawn at the
// document's root: a page eases in with a transform, and anything fixed
// inside a transformed box is held to that box instead of the window.
export default function TrackerDetail({ entry, onClose, onUpdate, onRemove, onNotJob }) {
  const [asking, setAsking] = useState(null);
  const origin = entry.contact ? [entry.contact.name, entry.contact.email].filter(Boolean).join(', ') : entry.events?.find((event) => event.from)?.from;
  const fromMail = entry.source === 'mail';

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <Card as="aside" variant="pop" aria-label={`${entry.company}, details`} className="drawer-in fixed bottom-0 right-0 top-12 z-30 flex w-[min(28rem,100vw)] flex-col rounded-none border-y-0 border-r-0">
      <header className="flex items-start gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-ink">{entry.company}</h2>
          <p className="text-sm text-ink/80">{entry.role || 'No role given'}</p>
          {origin && <p className="text-xs text-muted">{origin}{fromMail ? ', found in your mail' : ''}</p>}
        </div>
        <IconButton label="Close" className="ml-auto" onClick={onClose}><CloseIcon size={16} /></IconButton>
      </header>

      <TrackerDetailBody entry={entry} onUpdate={onUpdate} />

      <footer className="flex flex-col gap-2 border-t border-line px-5 py-3.5">
        {asking === 'not-job' && <p className="text-xs text-muted">Removes it and every card from {notJobScope(entry)}, and scans skip that from now on.</p>}
        <div className="flex flex-wrap items-center gap-2">
          {asking === 'not-job' && <Button variant="danger" onClick={() => onNotJob(entry.id)}>Yes, not a job</Button>}
          {asking === 'stop' && <Button variant="danger" onClick={() => onRemove(entry.id)}>Yes, stop tracking</Button>}
          {asking && <Button onClick={() => setAsking(null)}>Cancel</Button>}
          {!asking && (
            <>
              <Button onClick={() => startChatDraft(mailDraft(entry))}><MailIcon size={14} />{entry.contact?.email ? `Email ${entry.contact.name || 'them'}` : 'Email someone there'}</Button>
              {fromMail && <Button onClick={() => setAsking('not-job')}>Not a job</Button>}
              <Button variant="ghost" onClick={() => setAsking('stop')}>Stop tracking</Button>
            </>
          )}
        </div>
      </footer>
    </Card>,
    document.body,
  );
}
