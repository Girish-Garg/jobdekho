import { useRef, useState } from 'react';
import { TextField } from './ProfileField.jsx';
import StillGoing from './StillGoing.jsx';
import { isOngoing, smallFields } from '../lib/entryFields.js';

const LABELS = { location: 'Location', startDate: 'Start', endDate: 'End' };
// Whole class names, so Tailwind finds each one: four go two to a row on a
// phone and one row from sm up; three stack on a phone rather than leave a
// hole at the end of a row.
const COLS = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' };

// The small fields under an entry's title, sharing one row in equal parts
// that fill it, bottoms aligned, whatever the section holds (see
// smallFields). With "Still going" on, End shows Present and takes no
// typing. Turned off, End opens empty with the cursor in it, and stays open
// while it is empty, though an empty End still reads as Present next time.
export default function SmallFields({ entry, meta, onChange }) {
  const [endOpen, setEndOpen] = useState(false);
  const endBox = useRef(null);
  const fields = smallFields(meta, entry);
  const still = fields.includes('ongoing') && !endOpen && isOngoing(entry.endDate);
  const label = (key) => meta.dateLabels?.[key] ?? LABELS[key];

  // On, the end is kept as "Present", so the resume prints "Jul 2023 -
  // Present" rather than a start date standing alone.
  function toggle(on) {
    setEndOpen(!on);
    onChange({ ...entry, endDate: on ? 'Present' : isOngoing(entry.endDate) ? '' : entry.endDate });
    if (!on) endBox.current?.focus();
  }

  return (
    <div className={`grid items-end gap-3 ${COLS[fields.length]}`}>
      {fields.map((key) => (key === 'ongoing' ? <StillGoing key={key} on={still} onChange={toggle} /> : (
        <TextField
          key={key}
          label={label(key)}
          value={key === 'endDate' && still ? 'Present' : entry[key]}
          readOnly={key === 'endDate' && still}
          placeholder={key === 'endDate' ? meta.endHint : undefined}
          inputRef={key === 'endDate' ? endBox : undefined}
          onChange={(value) => onChange({ ...entry, [key]: value })}
        />
      )))}
    </div>
  );
}
