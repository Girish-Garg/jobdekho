import { entryShown, withEntry } from '../lib/tailorReview.js';
import Switch from './ui/Switch.jsx';
import TailorHead from './TailorHead.jsx';
import TailorBullets from './TailorBullets.jsx';

// Why an entry the tailoring did not pick is where it is.
const NOTE = {
  fill: 'Not picked for this job, in so Projects is not thin',
  out: 'Not picked for this job',
};

// One role, project, degree or award: its switch takes the whole entry in
// or out of the resume, and while it is in, its bullets are listed under
// it. An entry the tailoring picked has each bullet to choose over; one it
// did not prints as the person wrote it.
function Entry({ entry, choices, onChange }) {
  const shown = entryShown(choices, entry);
  const name = [entry.title || 'Untitled', entry.organisation].filter(Boolean).join(' at ');

  return (
    <li className="flex flex-col gap-1 border-t border-line py-2.5 first:border-t-0">
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${shown ? 'text-ink' : 'text-muted'}`}>{name}</p>
          {NOTE[entry.state] && <p className="text-xs text-muted">{NOTE[entry.state]}</p>}
        </div>
        <Switch size="sm" on={shown} onChange={(on) => onChange(withEntry(choices, entry, on))} aria-label={`${name}, in the resume`} />
      </div>
      {shown && entry.bullets && <TailorBullets entry={entry} choices={choices} onChange={onChange} />}
      {shown && entry.own?.length > 0 && (
        <ul className="flex flex-col gap-1 pt-1">
          {entry.own.map((text, at) => <li key={at} className="text-sm text-ink/80">{text}</li>)}
        </ul>
      )}
    </li>
  );
}

// One section of the resume, its entries in the order they print, the ones
// left out last.
export default function TailorSection({ section, choices, onChange }) {
  const out = section.entries.filter((entry) => !entryShown(choices, entry)).length;
  return (
    <section aria-label={section.title} className="flex flex-col gap-1">
      <TailorHead title={section.title} note={out ? `${out} left out` : null} />
      <ul className="flex flex-col">
        {section.entries.map((entry) => <Entry key={entry.id} entry={entry} choices={choices} onChange={onChange} />)}
      </ul>
    </section>
  );
}
