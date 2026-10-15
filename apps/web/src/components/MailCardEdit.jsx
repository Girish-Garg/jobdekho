import { useState } from 'react';
import Button from './ui/Button.jsx';
import TextInput from './ui/TextInput.jsx';
import TextArea from './ui/TextArea.jsx';
import { Labelled } from './ProfileField.jsx';

// The person's own edit of a drafted mail, saved as the mail that will go
// (see the server's chat/mail-edit.js). Saving never sends it: the card
// then waits for Send.
export default function MailCardEdit({ mail, onSave, onCancel }) {
  const [to, setTo] = useState(mail.to);
  const [subject, setSubject] = useState(mail.subject);
  const [body, setBody] = useState(mail.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave({ to, subject, body });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <Labelled label="To">
        <TextInput type="email" value={to} onChange={(e) => setTo(e.target.value)} autoComplete="off" spellCheck={false} />
      </Labelled>
      <Labelled label="Subject">
        <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} autoComplete="off" />
      </Labelled>
      <Labelled label="Mail">
        <TextArea rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="leading-relaxed" />
      </Labelled>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" type="submit" disabled={busy || !to.trim() || !subject.trim() || !body.trim()}>
          {busy ? 'Saving...' : 'Save changes'}
        </Button>
        <Button onClick={onCancel} disabled={busy}>Cancel</Button>
        <span className="text-xs text-muted">Saving does not send it.</span>
      </div>
      {error && <p role="alert" className="text-sm text-ember">{error}</p>}
    </form>
  );
}
