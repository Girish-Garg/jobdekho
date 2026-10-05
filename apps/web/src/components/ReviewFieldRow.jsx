import { fieldLabel, fieldValue } from '../lib/reviewRowText.js';
import ReviewTag from './ReviewTag.jsx';

// A single value the resume would fill in or change: a basics field left
// empty, the years or the degree. Where the profile already states one, it
// is named beside the resume's, since that is the whole question.
export default function ReviewFieldRow({ row, on, onToggle }) {
  return (
    <li className="border-b border-line py-2.5">
      <label className="flex cursor-pointer items-center gap-3">
        <input type="checkbox" checked={on} onChange={onToggle} className="h-4 w-4 shrink-0 accent-primary" />
        <ReviewTag kind={row.kind} />
        <span className="min-w-0 flex-1 truncate text-sm">
          <b className="font-semibold text-ink">{fieldLabel(row.field)}</b>
          <span className="text-muted"> {fieldValue(row.field, row.value)}</span>
        </span>
        {row.before != null && <span className="shrink-0 text-xs text-muted">You have {fieldValue(row.field, row.before)}</span>}
      </label>
    </li>
  );
}
