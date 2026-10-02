import { useId } from 'react';
import Switch from './ui/Switch.jsx';

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
      <Switch
        on={on}
        onChange={onChange}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        className="mt-0.5 shrink-0"
      />
    </div>
  );
}
