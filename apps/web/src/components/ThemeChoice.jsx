import { useEffect, useState } from 'react';
import { CHOICES, applyTheme, onChoiceChange, readChoice, writeChoice } from '../lib/theme.js';
import { CheckIcon } from './Icon.jsx';
import ThemePreview from './ThemePreview.jsx';

const WORD = { system: 'Follow my system', light: 'Light', dark: 'Dark' };

// The full choice, where there is room to name it. The topbar switch only
// flips light and dark, because a switch that sometimes changes nothing is a
// broken switch; "follow my system" needs a label to mean anything. Each
// choice shows a thumbnail of the app in it, which says more than the word.
export default function ThemeChoice() {
  const [choice, setChoice] = useState(() => readChoice());

  useEffect(() => onChoiceChange(setChoice), []);

  function pick(next) {
    writeChoice(next);
    applyTheme(next);
    setChoice(next);
  }

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {CHOICES.map((value) => {
        const on = value === choice;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => pick(value)}
            className={`flex flex-col gap-2.5 rounded-2xl border p-2 text-left transition duration-fast ease ${
              on ? 'border-primary bg-primary/5 ring-4 ring-primary/15' : 'border-line bg-paper/60 hover:border-edge'
            }`}
          >
            <ThemePreview theme={value} />
            <span className="flex items-center justify-between gap-2 px-1.5 pb-1 text-sm font-semibold text-ink">
              {WORD[value]}
              {on && (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-on-primary">
                  <CheckIcon size={12} />
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
