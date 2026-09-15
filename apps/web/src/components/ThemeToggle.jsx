import { useEffect, useState } from 'react';
import { CHOICES, applyTheme, onChoiceChange, readChoice, writeChoice, watchSystem } from '../lib/theme.js';

// Sun, moon, and the half-filled circle that means "whatever the system says".
const FACE = { light: '○', dark: '●', system: '◑' };
const NEXT = { system: 'light', light: 'dark', dark: 'system' };
const SAYS = { system: 'Theme: follows your system', light: 'Theme: light', dark: 'Theme: dark' };

// One button that cycles, rather than three that mostly sit unused: the theme
// is a thing you set once, and the label says which state it is in now.
export default function ThemeToggle() {
  const [choice, setChoice] = useState(() => readChoice());

  useEffect(() => {
    applyTheme(choice);
    // The system only gets a vote while the choice is to follow it.
    return choice === 'system' ? watchSystem(() => applyTheme('system')) : undefined;
  }, [choice]);

  // The command palette can set the theme too, so the button follows the
  // choice rather than owning it.
  useEffect(() => onChoiceChange(setChoice), []);

  function cycle() {
    const next = NEXT[choice] ?? CHOICES[0];
    writeChoice(next);
    setChoice(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={SAYS[choice]}
      title={SAYS[choice]}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors duration-fast ease hover:border-edge hover:text-ink"
    >
      <span aria-hidden="true" className="text-md leading-none">{FACE[choice]}</span>
    </button>
  );
}
