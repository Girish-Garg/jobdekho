import { useEffect, useState } from 'react';
import { CHOICES, applyTheme, onChoiceChange, readChoice, writeChoice } from '../lib/theme.js';

const WORD = { system: 'Follow my system', light: 'Light', dark: 'Dark' };

// The full choice, where there is room to name it. The topbar switch only
// flips light and dark, because a switch that sometimes changes nothing is a
// broken switch; "follow my system" needs a label to mean anything.
export default function ThemeChoice() {
  const [choice, setChoice] = useState(() => readChoice());

  useEffect(() => onChoiceChange(setChoice), []);

  function pick(next) {
    writeChoice(next);
    applyTheme(next);
    setChoice(next);
  }

  return (
    <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-1.5">
      {CHOICES.map((value) => {
        const on = value === choice;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => pick(value)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors duration-fast ease ${
              on ? 'border-ink bg-ink text-paper' : 'border-line text-muted hover:border-edge hover:text-ink'
            }`}
          >
            {WORD[value]}
          </button>
        );
      })}
    </div>
  );
}
