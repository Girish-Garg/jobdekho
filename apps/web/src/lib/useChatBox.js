import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { takeDraft } from './chatDraftSignal.js';

// The question box's text and the three things that happen to it on their
// own (see ChatInput.jsx): it grows with what is typed, up to the six lines
// its CSS allows; `focusKey` changing moves focus into it, since picking a
// card to change is always followed by typing what to change; and a `draft`
// put in it from elsewhere ("Add a project: ", a missed question to edit) is
// taken once, with the caret left at its end for the person to go on.
//
// The text is the box's own unless `value` and `onValue` hand it in: the
// chat keeps each chat's draft itself (see chatDrafts.js), so switching
// chats switches the text.
export function useChatBox({ focusKey = null, draft = null, value: held, onValue }) {
  const [own, setOwn] = useState('');
  const value = held ?? own;
  const setValue = onValue ?? setOwn;
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
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return { value, setValue, box };
}
