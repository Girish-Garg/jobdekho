import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { takeDraft } from '../lib/chatDraftSignal.js';
import { ArrowUpIcon } from './Icon.jsx';

const ASK = 'Ask about what is on screen';

const BOX = 'flex items-end gap-2 rounded-2xl border border-line bg-paper py-1.5 pl-3.5 pr-1.5 shadow-raise transition duration-fast ease '
  + 'focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/15';
const SEND = 'grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-on-primary transition duration-fast ease '
  + 'hover:brightness-110 disabled:bg-ink/10 disabled:text-muted disabled:hover:brightness-100';

// Enter sends, shift+Enter writes a new line - the one binding a multi-line
// question box needs beyond what a plain input already gives for free.
// lib/useListKeys.js already leaves a typing target alone, so a textarea
// here needs nothing extra to keep j/k/s/a/d/u working on the list behind it.
//
// The box is one line until the question is longer, then grows to six and
// scrolls after that, so a short question does not sit in a tall empty box
// and a long one is still all in view while it is being written. The focus
// ring is on the whole rounded box, which is the control as the eye sees it.
//
// `placeholder` and `submitLabel` change while a card is the reply target,
// so the box itself says the words will change that card; `focusKey`
// changing moves focus here, since picking a card to change is always
// followed by typing what to change.
//
// `draft` is the start of a request put in the box from elsewhere ("Add a
// project: " from the Profile page), taken once, with the caret left at its
// end for the person to finish the sentence.
export default function ChatInput({ busy, onSend, placeholder = ASK, submitLabel = 'Ask', focusKey = null, draft = null }) {
  const [value, setValue] = useState('');
  const box = useRef(null);
  const caretToEnd = useRef(false);

  useEffect(() => {
    if (focusKey) box.current?.focus();
  }, [focusKey]);

  useEffect(() => {
    if (!takeDraft(draft)) return;
    caretToEnd.current = true;
    setValue(draft.text);
    box.current?.focus();
  }, [draft]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    if (!caretToEnd.current) return;
    caretToEnd.current = false;
    el.focus();
    el.setSelectionRange?.(value.length, value.length);
  }, [value]);

  function submit() {
    const text = value.trim();
    if (!text || busy) return;
    setValue('');
    onSend(text);
  }

  function onKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className={BOX}>
        <textarea
          ref={box}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={busy}
          rows={1}
          placeholder={placeholder}
          aria-label={placeholder}
          className="max-h-[8.75rem] min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1 text-base text-ink outline-none placeholder:text-muted focus-visible:outline-none disabled:opacity-60"
        />
        <button type="button" onClick={submit} disabled={busy || !value.trim()} aria-label={submitLabel} title={submitLabel} className={SEND}>
          <ArrowUpIcon size={16} />
        </button>
      </div>
      <p className="px-1 text-xs text-muted">Runs on your own AI CLI, on your own subscription.</p>
    </div>
  );
}
