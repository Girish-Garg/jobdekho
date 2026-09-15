import { useEffect, useState } from 'react';
import { applyTheme, onChoiceChange, prefersDark, readChoice, resolve, writeChoice } from '../lib/theme.js';

// A control has to visibly do something every time it is pressed. Cycling
// system, light, dark failed that: on a machine set to dark, going from dark
// back to system changed nothing on screen, so one press in three read as
// broken. This is a straight switch between the two themes a person can see.
// "Follow my system" still exists, as a named choice in Settings, where a
// setting can say what it means.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => resolve(readChoice(), prefersDark()));

  useEffect(() => {
    const sync = () => setTheme(applyTheme(readChoice()));
    sync();
    return onChoiceChange(sync);
  }, []);

  function flip() {
    const next = theme === 'dark' ? 'light' : 'dark';
    writeChoice(next);
    setTheme(applyTheme(next));
  }

  const to = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={`Switch to ${to} theme`}
      title={`Switch to ${to} theme`}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors duration-fast ease hover:border-edge hover:text-ink"
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </button>
  );
}

// Drawn rather than pulled from an icon set: two shapes at one size, and no
// dependency for them.
const Sun = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.3">
    <circle cx="8" cy="8" r="3.1" />
    <path strokeLinecap="round" d="M8 1.4v1.5M8 13.1v1.5M1.4 8h1.5M13.1 8h1.5M3.3 3.3l1.1 1.1M11.6 11.6l1.1 1.1M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1" />
  </svg>
);

const Moon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.3">
    <path strokeLinejoin="round" d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z" />
  </svg>
);
