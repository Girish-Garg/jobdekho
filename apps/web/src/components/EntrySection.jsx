import { makeEntry } from '../lib/newEntry.js';
import EntryCard from './EntryCard.jsx';

// Every generic section (experience, projects, education, certifications,
// achievements) is this same shell around a list of EntryCard; only the
// metadata from profileSections.js changes what it is called and how it
// labels an entry's fields.
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
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-md font-semibold text-ink">
          {meta.label} <span className="font-mono text-xs font-normal text-muted">{entries.length}</span>
        </h3>
        <button type="button" onClick={add} className="rounded-full border border-line px-3 py-1 text-xs text-ink transition hover:border-ink">
          {meta.add}
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs leading-relaxed text-muted">{meta.hint}</p>
      ) : (
        <div className="flex flex-col gap-2">
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
    </section>
  );
}
