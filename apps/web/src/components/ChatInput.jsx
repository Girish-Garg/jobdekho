import { useEffect, useRef, useState } from 'react';

const ASK = 'Ask about what is on screen';

// Enter sends, shift+Enter writes a new line - the one binding a multi-line
// question box needs beyond what a plain input already gives for free.
// lib/useListKeys.js already leaves a typing target alone, so a textarea
// here needs nothing extra to keep j/k/s/a/d/u working on the list behind it.
//
// `placeholder` and `submitLabel` change while a card is the reply target,
// so the box itself says the words will change that card; `focusKey`
// changing moves focus here, since picking a card to change is always
// followed by typing what to change.
export default function ChatInput({ busy, onSend, placeholder = ASK, submitLabel = 'Ask', focusKey = null }) {
  const [value, setValue] = useState('');
  const box = useRef(null);

  useEffect(() => {
    if (focusKey) box.current?.focus();
  }, [focusKey]);

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
    <div className="flex flex-col gap-1.5 p-3">
      <textarea
        ref={box}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        disabled={busy}
        rows={2}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full resize-none rounded-md border border-line bg-paper px-2.5 py-2 text-sm text-ink outline-none transition-colors duration-fast ease focus:border-edge disabled:opacity-60"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">Each message here asks an AI CLI on this computer, on your own subscription.</p>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !value.trim()}
          className="shrink-0 rounded-md border border-line px-2.5 py-1 text-sm text-ink transition-colors duration-fast ease hover:border-edge disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
