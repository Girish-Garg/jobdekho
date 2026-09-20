import { makeGroup } from '../lib/newEntry.js';
import { sectionId } from '../lib/profileIndex.js';
import ProfileSection, { AddControl } from './ProfileSection.jsx';
import { BOX, Labelled } from './ProfileField.jsx';
import TagInput from './TagInput.jsx';

const HINT = 'Group your skills the way a resume would: Languages, Frameworks, Tools. Feeds the Skills field under Best fit too.';

// Grouped rather than one flat list (Languages, Frameworks, ...), so a
// hundred skills reads as a handful of rows. deriveSkills.js folds every
// group into the flat ranking field at save time, so this is the one place
// skills actually get typed.
export default function SkillGroupsSection({ groups, onChange }) {
  const add = () => onChange([...groups, makeGroup()]);
  const update = (index, group) => onChange(groups.map((g, i) => (i === index ? group : g)));
  const remove = (index) => onChange(groups.filter((_, i) => i !== index));

  return (
    <ProfileSection
      id={sectionId('skills')}
      title="Skills"
      count={groups.length}
      hint={groups.length === 0 ? HINT : null}
      action={<AddControl label="Add group" onClick={add} />}
    >
      {groups.length > 0 && (
        <div className="flex flex-col divide-y divide-line border-t border-line">
          {groups.map((group, i) => (
            <div key={group.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:gap-6">
              <div className="sm:w-48 sm:shrink-0">
                <Labelled label="Group name">
                  <input
                    className={BOX}
                    placeholder="e.g. Languages"
                    value={group.name}
                    onChange={(event) => update(i, { ...group, name: event.target.value })}
                  />
                </Labelled>
              </div>
              <div className="min-w-0 max-w-xl flex-1">
                <TagInput plain label="Items" values={group.items} onChange={(items) => update(i, { ...group, items })} />
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="self-start text-sm text-muted transition-colors duration-fast ease-ease hover:text-ink sm:mt-6"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}
