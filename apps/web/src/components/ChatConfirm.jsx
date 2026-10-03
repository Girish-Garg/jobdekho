import Button from './ui/Button.jsx';

// The ways out sit back from the act: the quiet button with its label muted
// and at the plain weight.
const MUTED = 'font-normal text-muted hover:text-ink';

// Asks before something with no undo (deleting a chat, clearing it,
// replacing a draft), in place, where the person pressed: a dialog over the
// panel would hide the very thing being asked about.
export default function ChatConfirm({ question, yes, no = 'Keep it', danger = true, onYes, onNo, className = '' }) {
  return (
    <div role="group" aria-label={question} className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <p className="min-w-0 flex-1 text-sm text-ink">{question}</p>
      <Button size="sm" onClick={onNo} className={MUTED}>{no}</Button>
      <Button size="sm" variant={danger ? 'danger' : 'primary'} onClick={onYes}>{yes}</Button>
    </div>
  );
}
