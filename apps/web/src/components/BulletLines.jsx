import { useId, useLayoutEffect, useRef, useState } from 'react';
import BulletLine from './BulletLine.jsx';
import { PlusIcon } from './Icon.jsx';
import { breakLine, dropLine, moveLine, pasteLines } from '../lib/bulletLines.js';

// "What you did" as one input per line rather than one box of text, so a
// line can be dragged, moved or removed on its own. It types like a list in
// any editor: Enter starts the next line, Backspace in an empty one goes
// back up, a paste of several lines lands as several lines, and Alt with
// an arrow moves the line the cursor is in. Each edit says which line to
// focus next; that happens once the new lines are on the page.
export default function BulletLines({ lines, onChange }) {
  const boxes = useRef([]);
  const addButton = useRef(null);
  const focus = useRef(null);
  const [drag, setDrag] = useState(null);
  const hintId = useId();

  // A line removed with none left to go to hands the focus to "Add a line"
  // (index -1), rather than dropping it on the page.
  useLayoutEffect(() => {
    const want = focus.current;
    focus.current = null;
    const box = want && (want.index < 0 ? addButton.current : boxes.current[want.index]);
    if (!box) return;
    box.focus();
    if (want.index < 0) return;
    const at = Math.min(want.caret ?? box.value.length, box.value.length);
    box.setSelectionRange(at, at);
  });

  const commit = (next, target) => {
    focus.current = target;
    onChange(next);
  };
  const move = (from, to, caret) => {
    const next = moveLine(lines, from, to);
    if (next) commit(next, { index: to, caret });
  };
  const remove = (index) => commit(lines.filter((_, i) => i !== index), { index: lines.length > 1 ? Math.max(0, index - 1) : -1 });

  function onKeyDown(event, index) {
    const box = event.currentTarget;
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      const { lines: next, focus: target } = breakLine(lines, index, box.selectionStart, box.selectionEnd);
      commit(next, target);
    } else if (event.key === 'Backspace' && box.value === '' && index > 0) {
      event.preventDefault();
      const { lines: next, focus: target } = dropLine(lines, index);
      commit(next, target);
    } else if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      move(index, index + (event.key === 'ArrowUp' ? -1 : 1), box.selectionStart);
    }
  }

  function onPaste(event, index) {
    const box = event.currentTarget;
    const pasted = pasteLines(lines, index, box.selectionStart, box.selectionEnd, event.clipboardData?.getData('text'));
    if (!pasted) return;
    event.preventDefault();
    commit(pasted.lines, pasted.focus);
  }

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-sm text-muted">What you did</legend>
      <p id={hintId} className="sr-only">Enter starts a new line, Backspace in an empty line removes it, Alt with an up or down arrow moves the line.</p>
      {lines.map((line, i) => (
        <BulletLine
          key={i}
          line={line}
          index={i}
          hintId={hintId}
          inputRef={(box) => { boxes.current[i] = box; }}
          drag={drag}
          onDrag={setDrag}
          onDrop={(to) => { if (drag) move(drag.from, to); setDrag(null); }}
          onChange={(text) => onChange(lines.map((l, j) => (j === i ? text : l)))}
          onKeyDown={(event) => onKeyDown(event, i)}
          onPaste={(event) => onPaste(event, i)}
          onRemove={() => remove(i)}
        />
      ))}
      <button ref={addButton} type="button" onClick={() => commit([...lines, ''], { index: lines.length, caret: 0 })} className="btn btn-ghost btn-sm self-start px-1.5">
        <PlusIcon size={12} />
        Add a line
      </button>
    </fieldset>
  );
}
