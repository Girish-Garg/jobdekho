const LEGEND = 'text-xs font-semibold text-muted';

// Wraps a single form control, so the caption stays a real <label>.
export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LEGEND}>{label}</span>
      {children}
    </label>
  );
}
