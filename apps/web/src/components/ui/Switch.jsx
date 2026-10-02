// An on/off switch. It is a button with role="switch", so Space and Enter
// flip it and a screen reader hears "on" or "off", and its look is read off
// aria-checked (controls.css), so the two cannot disagree. Name it with
// aria-label or aria-labelledby; size="sm" fits inside a field's height.
export default function Switch({ on, onChange, size, className = '', ...props }) {
  const sized = size === 'sm' ? ' switch-sm' : '';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`switch${sized} ${className}`.trim()}
      {...props}
    >
      <span aria-hidden="true" className="switch-knob" />
    </button>
  );
}
