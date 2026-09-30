import { useState } from 'react';
import { EFFECT_CHOICES, applyEffects, readEffectsChoice, writeEffectsChoice } from '../lib/effects.js';
import { installReveal } from '../lib/reveal.js';
import { useSlidingPill } from '../lib/useSlidingPill.js';
import SlidingPill from './SlidingPill.jsx';

const WORD = { auto: 'Automatic', full: 'Full', light: 'Light', off: 'Off' };

const MEANS = {
  full: 'Every effect: lit cards that follow the pointer, the dithered ground, things easing in as they arrive.',
  light: 'The small touches only. Nothing repaints as the pointer moves, which is what a slow computer feels.',
  off: 'Nothing moves, the same as asking your system for less motion.',
};

// How much motion and texture this computer draws (see lib/effects.js).
// Automatic says what it picked, since "automatic" alone hides the answer.
export default function EffectsChoice() {
  const [choice, setChoice] = useState(() => readEffectsChoice());
  const [level, setLevel] = useState(() => document.documentElement.dataset.effects || 'full');
  const pill = useSlidingPill(choice);

  function pick(next) {
    writeEffectsChoice(next);
    setChoice(next);
    const applied = applyEffects(next);
    setLevel(applied);
    // Started with effects off, nothing was watching for arrivals yet.
    if (applied !== 'off') installReveal();
  }

  return (
    <div className="mt-6">
      <p id="effects-label" className="text-sm font-semibold text-ink">Motion and effects</p>
      <div
        ref={pill.ref}
        role="radiogroup"
        aria-labelledby="effects-label"
        className="relative mt-2 inline-flex flex-wrap rounded-full border border-line bg-panel p-0.5 text-sm text-muted"
      >
        <SlidingPill style={pill.style} glides={pill.glides} />
        {EFFECT_CHOICES.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={value === choice}
            data-pill-key={value}
            onClick={() => pick(value)}
            className={`relative rounded-full px-3.5 py-1 transition-colors duration-fast ease ${value === choice ? 'font-medium text-ink' : 'hover:text-ink'}`}
          >
            {WORD[value]}
          </button>
        ))}
      </div>
      <p className="mt-2 max-w-xl text-xs text-muted">
        {choice === 'auto' && <span className="font-medium text-ink">Picked for this computer: {WORD[level].toLowerCase()}. </span>}
        {MEANS[level]}
      </p>
    </div>
  );
}
