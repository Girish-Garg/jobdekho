const LEGEND = 'font-mono text-[10px] uppercase tracking-[0.18em] text-muted';

// Wraps a single form control, so the caption stays a real <label>.
export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className={LEGEND}>{label}</span>
      {children}
    </label>
  );
}
