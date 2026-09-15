import { makeGroup } from '../lib/newEntry.js';
import TagInput from './TagInput.jsx';

const BOX = 'rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-ink';

// Grouped rather than one flat list (Languages, Frameworks, ...), so a
// hundred skills reads as a handful of rows. deriveSkills.js folds every
// group into the flat ranking field at save time, so this is the one place
// skills actually get typed.
export default function SkillGroupsSection({ groups, onChange }) {
  const add = () => onChange([...groups, makeGroup()]);
  const update = (index, group) => onChange(groups.map((g, i) => (i === index ? group : g)));
  const remove = (index) => onChange(groups.filter((_, i) => i !== index));

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-md font-semibold text-ink">
          Skills <span className="font-mono text-xs font-normal text-muted">{groups.length}</span>
        </h3>
        <button type="button" onClick={add} className="rounded-full border border-line px-3 py-1 text-xs text-ink transition hover:border-ink">
          Add group
        </button>
      </div>
      {groups.length === 0 ? (
        <p className="text-xs leading-relaxed text-muted">
          Group your skills the way a resume would: Languages, Frameworks, Tools. Feeds the Skills field below too.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((group, i) => (
            <div key={group.id} className="flex flex-col gap-2 rounded-md border border-line bg-paper p-3">
              <div className="flex items-center gap-2">
                <input
                  aria-label="Group name"
                  className={`${BOX} flex-1`}
                  placeholder="Group name, e.g. Languages"
                  value={group.name}
                  onChange={(event) => update(i, { ...group, name: event.target.value })}
                />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded-full border border-line px-2 py-1 text-xs text-muted transition hover:border-ink hover:text-ink"
                >
                  Remove
                </button>
              </div>
              <TagInput label="Items" values={group.items} onChange={(items) => update(i, { ...group, items })} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
