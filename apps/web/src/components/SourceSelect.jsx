import { useState } from 'react';
import { usePopover } from '../lib/usePopover.js';
import { TRIGGER, triggerTone, Caret } from './Dropdown.jsx';
import SourceMenu from './SourceMenu.jsx';

// Inverted picker: every board is in by default and a tick is removed to leave
// one out. The state is the exclude list, so a board added to the config later
// is included without anyone reopening this menu.
export default function SourceSelect({ options, excluded, onChange }) {
  const { open, setOpen, ref } = usePopover();
  const [pinned, setPinned] = useState([]);

  function toggleMenu() {
    if (!open) setPinned(excluded);
    setOpen(!open);
  }

  // Whatever was excluded when the menu opened stays on top. Re-ranking on every
  // tick instead would slide rows out from under the cursor.
  const ranked = [
    ...options.filter((o) => pinned.includes(o.name)),
    ...options.filter((o) => !pinned.includes(o.name)),
  ];
  const count = excluded.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggleMenu}
        aria-expanded={open}
        className={`${TRIGGER} ${triggerTone(count > 0 || open)}`}
      >
        {count === 0 ? 'All sources' : `${count} excluded`}
        <Caret />
      </button>
      {open && <SourceMenu options={ranked} excluded={excluded} onChange={onChange} />}
    </div>
  );
}
