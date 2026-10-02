import { useEffect, useRef, useState } from 'react';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import { toView } from '../lib/applyPoint.js';

// The list or calendar of a native control in the page (a select, a date, a
// suggestion list). The browser draws those as separate popups the live view
// never shows, so JobDekho draws the choices here, over the field, and the
// person's pick is set in the page. Escape or "Cancel" leaves it as it was.
export default function ApplyPicker({ picker, frame, width, onPick }) {
  const [typed, setTyped] = useState(picker.value || '');
  const first = useRef(null);
  useEffect(() => first.current?.focus(), []);
  const at = frame && width ? toView({ x: picker.rect.x + frame.sx, y: picker.rect.y + frame.sy, w: picker.rect.w, h: picker.rect.h }, frame, width) : { left: 16, top: 16 };
  const listed = picker.kind === 'select' || picker.kind === 'list';

  return (
    <Card
      variant="pop"
      role="dialog"
      aria-label="Choose a value"
      style={{ left: Math.max(8, at.left), top: at.top + (at.height ?? 0) + 4 }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') onPick(null);
      }}
      className="rise absolute z-20 flex max-h-72 w-72 flex-col overflow-hidden rounded-lg"
    >
      {listed ? (
        <ul role="listbox" className="min-h-0 flex-1 overflow-y-auto py-1">
          {picker.options.filter((o) => !o.disabled).map((option, i) => (
            <li key={`${option.value}-${i}`}>
              <button
                ref={i === 0 ? first : undefined}
                type="button"
                role="option"
                aria-selected={option.value === picker.value}
                onClick={() => onPick(option.value)}
                className={`w-full truncate px-3 py-1.5 text-left text-sm hover:bg-select focus-visible:bg-select focus-visible:outline-none ${option.value === picker.value ? 'font-semibold text-primary' : 'text-ink'}`}
              >
                {option.label || option.value || '(blank)'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <form className="flex items-center gap-2 p-3" onSubmit={(event) => { event.preventDefault(); onPick(typed); }}>
          <input ref={first} type={picker.kind} value={typed} onChange={(event) => setTyped(event.target.value)} className="min-w-0 flex-1 rounded border border-line bg-panel px-2 py-1 text-sm text-ink" />
          <Button variant="primary" size="sm" type="submit">Set</Button>
        </form>
      )}
      <Button variant="ghost" size="sm" onClick={() => onPick(null)} className="m-1 self-end">Cancel</Button>
    </Card>
  );
}
