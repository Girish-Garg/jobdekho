import { useId } from 'react';

// A caption over a row of pills. The pills are several buttons, so the
// caption names them as a group rather than labelling any one of them, and
// a hint says what picking one does when the caption alone cannot. A
// caption cut short under a heading ("Length, at most" under Internships)
// passes its whole name too, so the group still says what it is when a
// screen reader lands on it alone.
export function FieldGroup({ label, name, hint = '', children }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={name ? undefined : id} aria-label={name} className="flex flex-col gap-2">
      <p className="flex items-baseline justify-between gap-3">
        <span id={id} className="text-xs font-semibold text-muted">{label}</span>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </p>
      {children}
    </div>
  );
}
