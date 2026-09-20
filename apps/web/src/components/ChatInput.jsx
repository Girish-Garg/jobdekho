import { useState } from 'react';

// Enter sends, shift+Enter writes a new line - the one binding a multi-line
// question box needs beyond what a plain input already gives for free.
// lib/useListKeys.js already leaves a typing target alone, so a textarea
// here needs nothing extra to keep j/k/s/a/d/u working on the list behind it.
export default function ChatInput({ busy, onSend }) {
  const [value, setValue] = useState('');

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
    <div className="flex flex-col gap-1.5 border-t border-line p-3">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        disabled={busy}
        rows={2}
        placeholder="Ask about what is on screen"
        className="w-full resize-none rounded-md border border-line bg-paper px-2.5 py-2 text-sm text-ink outline-none transition-colors duration-fast ease focus:border-edge disabled:opacity-60"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">Each question here asks an AI CLI on this computer, on your own subscription.</p>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !value.trim()}
          className="shrink-0 rounded-md border border-line px-2.5 py-1 text-sm text-ink transition-colors duration-fast ease hover:border-edge disabled:opacity-50"
        >
          Ask
        </button>
      </div>
    </div>
  );
}
