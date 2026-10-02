import Select from './Select.jsx';
import LinkKindIcon from './LinkKindIcon.jsx';
import { LINK_KINDS, LINK_KIND_NAMES } from '../lib/linkKind.js';

// A link's kind as a native select (see Select.jsx), so the keyboard, a
// screen reader and a phone's own picker all work as anywhere else, with
// the chosen kind's icon drawn at its left edge, above the select's well.
export default function LinkKindSelect({ kind, label, onChange }) {
  return (
    <span className="relative flex min-w-0">
      <LinkKindIcon kind={kind} size={13} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted" />
      <Select block aria-label={label} value={kind} onChange={(event) => onChange(event.target.value)} className="field min-w-0 cursor-pointer pl-8">
        {LINK_KINDS.map((option) => <option key={option} value={option}>{LINK_KIND_NAMES[option]}</option>)}
      </Select>
    </span>
  );
}
