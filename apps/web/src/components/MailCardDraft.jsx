import { shortDay } from '../lib/time.js';
import { DocumentIcon } from './Icon.jsx';

// The mail as it will go: who it is to, the subject, the body as written
// (line breaks kept), and what goes with it. A mail to an address mailed
// before says when, since that is the one that waits for Send.
export default function MailCardDraft({ mail, canChange, onChangeAttachment }) {
  const attached = mail.attach && mail.attach !== 'none' ? `${mail.attachName ?? 'Your resume'}.pdf` : null;
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-muted">
        To <span className="font-medium text-ink">{mail.name ? `${mail.name} <${mail.to}>` : mail.to}</span>
      </p>
      <p className="font-semibold text-ink">{mail.subject}</p>
      <p className="whitespace-pre-wrap leading-relaxed text-ink/90">{mail.body}</p>
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <DocumentIcon size={12} />
        <span>{attached ?? (mail.attach === 'none' ? 'No attachment' : 'No resume picked yet')}</span>
        {canChange && (
          <button type="button" onClick={onChangeAttachment} className="font-medium text-ink underline-offset-2 hover:underline">
            Change
          </button>
        )}
      </p>
      {mail.mailedBefore && mail.status === 'pending' && (
        <p className="text-xs text-ember">You mailed {mail.to} on {shortDay(mail.mailedBefore)}, so this one waits for you to press Send.</p>
      )}
    </div>
  );
}
