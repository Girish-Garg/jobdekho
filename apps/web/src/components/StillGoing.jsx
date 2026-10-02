import { useId } from 'react';
import Switch from './ui/Switch.jsx';

// "Still going" as a switch in a well the height of the inputs beside it
// (the same field look as TextInput, so the same padding and line height), so
// the row lines up along its bottom edge. The words are the switch's own
// label: pressing them flips it too, and a screen reader names it by them.
export default function StillGoing({ on, onChange, label = 'Still going' }) {
  const id = useId();
  return (
    <label htmlFor={id} className="field flex cursor-pointer items-center gap-2.5">
      <Switch id={id} size="sm" on={on} onChange={onChange} />
      <span className="truncate">{label}</span>
    </label>
  );
}
