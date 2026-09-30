import { forwardRef } from 'react';
import { keyMessage } from '../lib/applyKeys.js';

// The live view's keyboard. A textarea nobody sees holds the focus while the
// person types into the page: named keys go as keys, and everything else
// arrives as text through the textarea's own input events, which is how an
// IME (Hindi transliteration, the emoji picker, dead keys) and paste reach the
// page in any script. It is emptied after every piece of text, so it never
// holds what was typed, and it stops each key here so JobDekho's own shortcuts
// (and the posting dialog's Escape) never fire while the person is typing.
const ApplyTextCatcher = forwardRef(function ApplyTextCatcher({ onSend, onFocusChange }, ref) {
  const flush = (field) => {
    const text = field.value;
    field.value = '';
    if (text) onSend({ t: 'text', text });
  };

  return (
    <textarea
      ref={ref}
      aria-label="Type into the application form"
      autoComplete="off"
      spellCheck={false}
      className="pointer-events-none absolute left-0 top-0 h-px w-px resize-none opacity-0"
      onKeyDown={(event) => {
        event.stopPropagation();
        const msg = keyMessage(event);
        if (!msg) return;
        event.preventDefault();
        onSend(msg);
      }}
      onInput={(event) => {
        if (!event.nativeEvent.isComposing) flush(event.currentTarget);
      }}
      onCompositionEnd={(event) => flush(event.currentTarget)}
      onFocus={() => onFocusChange(true)}
      onBlur={() => onFocusChange(false)}
    />
  );
});

export default ApplyTextCatcher;
