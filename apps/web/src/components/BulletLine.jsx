import { BOX } from './ProfileField.jsx';
import { CloseIcon, GripIcon } from './Icon.jsx';

// One bullet line: the grip it is dragged by, the line itself across the
// full width, and its remove button. The grip is for the pointer alone;
// the keyboard moves a line with Alt and an arrow (see BulletLines.jsx),
// which the line's description tells a screen reader.
export default function BulletLine({ line, index, hintId, inputRef, drag, onDrag, onDrop, onChange, onKeyDown, onPaste, onRemove }) {
  const dragging = drag?.from === index;
  const target = drag && drag.over === index && !dragging;

  function start(event) {
    const row = event.currentTarget.parentElement;
    event.dataTransfer?.setData?.('text/plain', String(index));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer?.setDragImage?.(row, 16, row.offsetHeight / 2);
    onDrag({ from: index, over: index });
  }

  return (
    <div
      onDragOver={(event) => {
        if (!drag) return;
        event.preventDefault();
        if (drag.over !== index) onDrag({ ...drag, over: index });
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(index);
      }}
      className={`flex items-center gap-1.5 rounded-lg transition duration-fast ease-ease ${dragging ? 'opacity-40' : ''} ${target ? 'ring-2 ring-primary/40' : ''}`}
    >
      <span
        draggable
        onDragStart={start}
        onDragEnd={() => onDrag(null)}
        aria-hidden="true"
        title="Drag to move this line"
        className="grid h-7 w-5 shrink-0 cursor-grab place-items-center text-muted transition-colors duration-fast ease-ease hover:text-ink active:cursor-grabbing"
      >
        <GripIcon size={14} />
      </span>
      <input
        ref={inputRef}
        aria-label={`Line ${index + 1}`}
        aria-describedby={hintId}
        value={line}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        className={`${BOX} min-w-0 flex-1`}
      />
      <button
        type="button"
        aria-label={`Remove line ${index + 1}`}
        onClick={onRemove}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted transition-colors duration-fast ease-ease hover:bg-ember/10 hover:text-ember"
      >
        <CloseIcon size={11} />
      </button>
    </div>
  );
}
