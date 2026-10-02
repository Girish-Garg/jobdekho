import { useLayoutEffect, useRef } from 'react';
import LinkRow from './LinkRow.jsx';
import LinkQuickAdd from './LinkQuickAdd.jsx';
import { blankLink } from '../lib/entryLinks.js';

// A list of links, one row each (see LinkRow.jsx), and the buttons that add
// one: an entry's links, or the basics' more links. Adding a row puts the
// cursor in its address; removing one puts it in the row before, or on the
// first add button when none is left, so the keyboard is never dropped.
export default function LinkRows({ label = 'Links', links, quick, addLabel, onChange }) {
  const addresses = useRef([]);
  const firstAdd = useRef(null);
  const focus = useRef(null);

  useLayoutEffect(() => {
    const index = focus.current;
    focus.current = null;
    if (index === null) return;
    (index < 0 ? firstAdd.current : addresses.current[index])?.focus();
  });

  const commit = (next, index) => {
    focus.current = index;
    onChange(next);
  };
  const add = (kind) => commit([...links, blankLink(kind)], links.length);
  const remove = (index) => commit(links.filter((_, i) => i !== index), links.length > 1 ? Math.max(0, index - 1) : -1);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm text-muted">{label}</legend>
      {links.length > 0 && (
        <div aria-hidden="true" className="hidden grid-cols-[7rem_minmax(0,3fr)_minmax(0,2fr)_1.75rem] gap-2 text-xs text-muted sm:grid">
          <span>Kind</span>
          <span>Address</span>
          <span>Label, optional</span>
        </div>
      )}
      {links.map((link, i) => (
        <LinkRow
          key={i}
          link={link}
          index={i}
          addressRef={(box) => { addresses.current[i] = box; }}
          onChange={(next) => onChange(links.map((l, j) => (j === i ? next : l)))}
          onRemove={() => remove(i)}
        />
      ))}
      <LinkQuickAdd kinds={quick} present={links.map((link) => link.kind)} addLabel={addLabel} firstRef={firstAdd} onAdd={add} />
    </fieldset>
  );
}
