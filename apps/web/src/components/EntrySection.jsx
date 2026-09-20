import { makeEntry } from '../lib/newEntry.js';
import { sectionId } from '../lib/profileIndex.js';
import ProfileSection, { AddControl } from './ProfileSection.jsx';
import EntryCard from './EntryCard.jsx';

// Every generic section (experience, projects, education, certifications,
// achievements) is this same shell around a list of EntryCard; only the
// metadata from profileSections.js changes what it is called and how it
// labels an entry's fields. The purpose line shows only while the section
// is empty: once there are rows, they say what the section is for, and an
// empty record stays short.
export default function EntrySection({ meta, entries, onChange }) {
  const add = () => onChange([...entries, makeEntry()]);
  const update = (index, entry) => onChange(entries.map((e, i) => (i === index ? entry : e)));
  const remove = (index) => onChange(entries.filter((_, i) => i !== index));
  function move(index, dir) {
    const to = index + dir;
    if (to < 0 || to >= entries.length) return;
    const next = [...entries];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  }

  return (
    <ProfileSection
      id={sectionId(meta.key)}
      title={meta.label}
      count={entries.length}
      hint={entries.length === 0 ? meta.hint : null}
      action={<AddControl label={meta.add} onClick={add} />}
    >
      {entries.length > 0 && (
        <div className="flex flex-col divide-y divide-line border-t border-line">
          {entries.map((entry, i) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              titleLabel={meta.titleLabel}
              orgLabel={meta.orgLabel}
              startOpen={!entry.title}
              isFirst={i === 0}
              isLast={i === entries.length - 1}
              onChange={(next) => update(i, next)}
              onRemove={() => remove(i)}
              onMove={(dir) => move(i, dir)}
            />
          ))}
        </div>
      )}
    </ProfileSection>
  );
}
