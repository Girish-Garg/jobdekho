import ChatBubble from './ChatBubble.jsx';
import ChatText from './ChatText.jsx';
import { CheckIcon, CloseIcon } from './Icon.jsx';

// What a fill came back as, said plainly (see the server's apply/fill-run.js).
const RESULT = { filled: 'set', refused: 'yours to answer', failed: 'did not take', gone: 'gone from the page', changed: 'changed under it', stopped: 'stopped' };

// One turn of the conversation beside the form: the person's words as a
// bubble, the AI's as text with what it set listed under it, so a wrong
// value is seen at once rather than found on the page later.
export default function ApplyChatMessage({ message }) {
  if (message.role === 'you') return <ChatBubble>{message.text}</ChatBubble>;
  if (message.role === 'note') return <p className="text-xs text-muted">{message.text}</p>;
  if (message.role === 'error') return <p role="alert" className="text-sm text-ember">{message.text}</p>;
  return (
    <div className="flex flex-col gap-2">
      <ChatText text={message.text} />
      {message.filled?.length > 0 && (
        <ul aria-label="What it set" className="flex flex-col gap-1 rounded-xl border border-line p-2.5 text-xs">
          {message.filled.map((f, i) => (
            <li key={i} className={`flex items-start gap-2 ${f.result === 'filled' ? 'text-ink' : 'text-muted'}`}>
              <span className={`mt-0.5 shrink-0 ${f.result === 'filled' ? 'text-applied' : 'text-ember'}`}>
                {f.result === 'filled' ? <CheckIcon size={11} /> : <CloseIcon size={11} />}
              </span>
              <span className="min-w-0">{f.label || 'A field'}: {RESULT[f.result] ?? f.result}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
