import { useEffect, useState } from 'react';
import { useMailState, sendMail, stopMail, saveMail, discardMail, setMailPhase } from '../lib/mailDrafts.js';
import { startMail, settleAttachment } from '../lib/mailStart.js';
import { useMailConnected } from '../lib/mailAccount.js';
import { toClipboard } from '../lib/clipboard.js';
import { notify } from '../lib/toast.js';
import Card from './ui/Card.jsx';
import Chip from './ui/Chip.jsx';
import Eyebrow from './ui/Eyebrow.jsx';
import MailCardDraft from './MailCardDraft.jsx';
import MailCardEdit from './MailCardEdit.jsx';
import MailCardFoot from './MailCardFoot.jsx';
import { CheckIcon, MailIcon } from './Icon.jsx';

const CHIP = { pending: ['primary', 'Not sent'], applied: ['applied', 'Sent'], discarded: ['quiet', 'Discarded'], refused: ['quiet', 'Not sendable'] };

// A mail the chat drafted (see the server's chat/mail-draft.js), as the
// person will send it. One that just arrived asks which resume goes with it
// and then counts down to send, with Stop, Edit and Send now in reach (see
// lib/mailStart.js); one from before waits for Send. Nothing here sends
// except the countdown running out or a press, and what goes is the draft
// as saved, edits included.
export default function MailCard({ proposal, fresh = false, chatId = null, onOpenSettings, onOpenTracker }) {
  const live = useMailState(proposal.id);
  const connected = useMailConnected();
  const [editing, setEditing] = useState(false);
  const mail = { ...proposal, ...live?.draft, status: live?.status ?? proposal.status, sentAt: live?.sentAt ?? proposal.sentAt, from: live?.from ?? proposal.from };
  const phase = live?.phase ?? 'idle';

  useEffect(() => {
    if (fresh && chatId && proposal.status === 'pending') startMail(chatId, proposal);
  }, [fresh, chatId, proposal]);

  const act = {
    send: async () => {
      if (!mail.attach && chatId && !(await settleAttachment(chatId, mail))) return;
      sendMail(proposal.id);
    },
    stop: () => stopMail(proposal.id),
    edit: () => {
      stopMail(proposal.id);
      setEditing(true);
    },
    discard: () => discardMail(proposal.id),
    openSettings: () => onOpenSettings?.(),
    openTracker: () => onOpenTracker?.(),
    copy: async () => {
      const copied = await toClipboard(`To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.body}`);
      notify(copied ? { title: 'Mail copied', kind: 'done' } : { title: 'Could not copy the mail' });
    },
  };
  const save = async (changes) => {
    await saveMail(proposal.id, changes);
    setEditing(false);
    setMailPhase(proposal.id, 'stopped');
  };
  const [tone, word] = CHIP[mail.status] ?? CHIP.pending;
  const pending = mail.status === 'pending';

  return (
    <Card as="section" variant="list" aria-label={`Mail to ${mail.name || mail.to}`} data-status={mail.status} className={`rounded-2xl bg-paper ${pending ? 'border-primary/35 shadow-raise' : ''}`}>
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${pending ? 'bg-primary/10 text-primary' : 'bg-ink/5 text-muted'}`}>
          {mail.status === 'applied' ? <CheckIcon size={15} /> : <MailIcon size={15} />}
        </span>
        <div className="min-w-0 flex-1">
          <Eyebrow primary={pending}>Mail</Eyebrow>
          <p className="text-sm font-semibold leading-snug text-ink">{[mail.role, mail.company].filter(Boolean).join(' at ') || mail.summary}</p>
        </div>
        <Chip tone={tone} className={`shrink-0 ${tone === 'quiet' ? 'bg-ink/5' : ''}`}>{word}</Chip>
      </div>
      <div className="border-t border-line bg-panel px-3.5 py-3">
        {editing
          ? <MailCardEdit mail={mail} onSave={save} onCancel={() => setEditing(false)} />
          : <MailCardDraft mail={mail} canChange={pending && phase !== 'sending' && Boolean(chatId)} onChangeAttachment={() => { stopMail(proposal.id); settleAttachment(chatId, mail); }} />}
      </div>
      {!editing && (
        <div className="border-t border-line px-3.5 py-2.5">
          <MailCardFoot mail={mail} phase={phase} endsAt={live?.endsAt} connected={connected} error={live?.error} act={act} />
        </div>
      )}
    </Card>
  );
}
