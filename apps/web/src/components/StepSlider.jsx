import { useId } from 'react';

// A slider over a fixed list of steps rather than a free number: the steps
// are the values the filters and the chat's allow-list know (see
// lib/ranges.js), spaced where the differences matter instead of evenly, so
// the thumb moves by index and reports the step's value. The label row says
// the current step in words, and the screen reader hears the same words
// rather than "4 of 11". The fill covers what the filter lets through: from
// the thumb to the right for a floor (`fill="end"`), from the left up to it
// for a ceiling.
export default function StepSlider({ label, steps, value, onChange, ends, fill = 'start' }) {
  const id = useId();
  const found = steps.findIndex(([v]) => v === value);
  const index = found === -1 ? 0 : found;
  const last = steps.length - 1;
  const [, words] = steps[index];
  const fromEnd = fill === 'end';
  const covered = ((fromEnd ? last - index : index) / last) * 100;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-xs font-semibold text-muted">{label}</label>
        <span className="tnum truncate text-sm font-semibold text-ink">{words}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={last}
        step={1}
        value={index}
        aria-valuetext={words}
        onChange={(event) => onChange(steps[Number(event.target.value)][0])}
        className="range"
        style={{ '--fill': `${covered}%`, '--from': fromEnd ? 'to left' : 'to right' }}
      />
      {ends && (
        <div className="flex justify-between text-[11px] text-muted">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
      )}
    </div>
  );
}
