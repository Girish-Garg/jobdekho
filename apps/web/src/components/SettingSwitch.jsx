import { useId } from 'react';

// One on/off setting: its name, a line on what it does, anything more the
// caller adds below that (a status), and the switch. Saving is the caller's
// (see useRefreshSetting.js), since each setting is saved as it is flipped.
export default function SettingSwitch({ label, hint, on, disabled, onChange, children = null }) {
  const labelId = useId();
  const hintId = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-sm">
        <span id={labelId} className="block font-semibold text-ink">{label}</span>
        <span id={hintId} className="text-muted">{hint}</span>
        {children}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors duration-fast ease disabled:opacity-60 ${
          on ? 'border-primary bg-primary' : 'border-edge bg-select'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-px top-px h-5 w-5 rounded-full shadow-raise transition-transform duration-fast ease ${
            on ? 'translate-x-5 bg-on-primary' : 'bg-panel'
          }`}
        />
      </button>
    </div>
  );
}
