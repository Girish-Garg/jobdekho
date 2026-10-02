import { useMemo, useState } from 'react';
import { useFocusTrap } from '../lib/useFocusTrap.js';
import { matchCommands } from '../lib/fuzzyMatch.js';
import { buildCommands } from '../lib/useCommandList.js';
import Card from './ui/Card.jsx';
import Eyebrow from './ui/Eyebrow.jsx';

const TITLE_ID = 'command-palette-title';

// One flat, fuzzy-filtered list rather than grouped sections: the category
// tag on each row already says what it does, and a list this short does not
// earn a second layout system.
export default function CommandPalette({ open, onClose, view, setView, filters, setFilters, setSort, onOpenHelp }) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const trapRef = useFocusTrap(open);

  const commands = useMemo(
    () => (open ? buildCommands({ view, setView, filters, setFilters, setSort, onOpenHelp }) : []),
    [open, view, setView, filters, setFilters, setSort, onOpenHelp],
  );
  const matches = useMemo(() => matchCommands(commands, query), [commands, query]);

  if (!open) return null;

  function run(command) {
    command.run();
    onClose();
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && matches[index]) {
      event.preventDefault();
      run(matches[index]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 pt-[15vh]" onMouseDown={onClose}>
      <Card
        ref={trapRef}
        variant="pop"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="pop-in w-full max-w-lg rounded-lg"
      >
        <h2 id={TITLE_ID} className="sr-only">Command palette</h2>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIndex(0);
          }}
          aria-label="Type a command"
          placeholder="Type a command"
          className="w-full border-b border-line bg-transparent px-4 py-3 text-base text-ink outline-none placeholder:text-muted"
        />
        <ul role="listbox" aria-label="Commands" className="max-h-80 overflow-y-auto p-2">
          {matches.map((command, i) => (
            <li key={command.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === index}
                onMouseEnter={() => setIndex(i)}
                onClick={() => run(command)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                  i === index ? 'bg-select text-ink' : 'text-ink hover:bg-select/60'
                }`}
              >
                {command.label}
                {/* Visual grouping only: folded into the option's accessible
                    name it would read as "Clear all filters Filter", which
                    says nothing a screen reader user needs. */}
                <Eyebrow as="span" aria-hidden="true" className="font-mono font-normal">
                  {command.category}
                </Eyebrow>
              </button>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="px-3 py-6 text-center font-mono text-xs text-muted">No matching command.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
