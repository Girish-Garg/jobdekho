import { useChatBox } from '../lib/useChatBox.js';
import Button from './ui/Button.jsx';
import ChatQueued from './ChatQueued.jsx';
import { ArrowUpIcon } from './Icon.jsx';

const ASK = 'Ask about what is on screen';

const BOX = 'flex items-end gap-2 rounded-2xl border border-line bg-paper py-1.5 pl-3.5 pr-1.5 shadow-raise transition duration-fast ease '
  + 'focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/15';

// Enter sends, shift+Enter writes a new line - the one binding a multi-line
// question box needs beyond what a plain input already gives for free.
// lib/useListKeys.js already leaves a typing target alone, so a textarea
// here needs nothing extra to keep j/k/s/a/d/u working on the list behind it.
//
// The box stays open while an answer is on its way, so the next question can
// be written meanwhile: sent then, it waits (`onQueue`) and goes once the
// answer is in, shown above the box until it does. `held` keeps Send back
// altogether (another chat's answer is running) while typing goes on. With
// `onStop`, the send button is Stop while an answer is being written and the
// box is empty, and Escape stops it either way.
//
// The box is one line until the question is longer, then grows to six and
// scrolls after that (see useChatBox.js, which also takes a draft put in it
// from elsewhere, and the text itself when the caller keeps it). The focus
// ring is on the whole rounded box, which is the control as the eye sees it.
// `placeholder` and `submitLabel` change while a card is the reply target,
// so the box itself says the words will change it.
export default function ChatInput({
  busy, held = false, onSend, onQueue = null, queued = null, onUnqueue = null, onStop = null,
  placeholder = ASK, submitLabel = 'Ask', focusKey = null, draft = null, value: text, onValue,
}) {
  const { value, setValue, box } = useChatBox({ focusKey, draft, value: text, onValue });
  const waits = held || (busy && !onQueue);

  function submit() {
    const words = value.trim();
    if (!words || waits) return;
    setValue('');
    if (busy) onQueue(words);
    else onSend(words);
  }

  function onKeyDown(event) {
    if (event.key === 'Escape' && busy && onStop) {
      event.preventDefault();
      onStop();
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  const stopping = busy && onStop && !value.trim();

  return (
    <div className="flex flex-col gap-1.5">
      {queued && <ChatQueued text={queued} onRemove={onUnqueue} />}
      <div className={BOX}>
        <textarea
          ref={box}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={placeholder}
          aria-label={placeholder}
          className="max-h-[8.75rem] min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1 text-base text-ink outline-none placeholder:text-muted focus-visible:outline-none"
        />
        {stopping ? (
          <Button size="sm" onClick={onStop} title="Stop the answer (Esc)" className="h-8 shrink-0">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px] bg-current" />
            Stop
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={submit}
            disabled={!value.trim() || waits}
            aria-label={submitLabel}
            title={submitLabel}
            className="btn-icon h-8 w-8 shrink-0"
          >
            <ArrowUpIcon size={16} />
          </Button>
        )}
      </div>
      <p className="px-1 text-xs text-muted">
        {busy && onStop ? 'Esc stops the answer.' : 'Enter sends, Shift+Enter for a new line.'}
      </p>
    </div>
  );
}
