import { makeGroup } from '../lib/newEntry.js';
import { sectionId } from '../lib/profileIndex.js';
import ProfileSection, { AddControl } from './ProfileSection.jsx';
import { BOX, Labelled } from './ProfileField.jsx';
import TagInput from './TagInput.jsx';
import AskAiControl from './AskAiControl.jsx';
import { TagIcon, TrashIcon } from './Icon.jsx';

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
      icon={TagIcon}
      count={groups.length}
      hint={groups.length === 0 ? HINT : null}
      action={(
        <>
          <AskAiControl prompt="Add these skills: " where="Skills" />
          <AddControl label="Add group" onClick={add} />
        </>
      )}
    >
      {groups.length > 0 && (
        <div className="flex flex-col divide-y divide-line">
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
              <div className="min-w-0 flex-1">
                <TagInput plain label="Items" values={group.items} onChange={(items) => update(i, { ...group, items })} />
              </div>
              {/* The same round bin as deleting a document, level with the
                  items box: a word floating at the row's far end read as a
                  stray caption. */}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove group"
                title="Remove group"
                className="grid h-8 w-8 shrink-0 place-items-center self-start rounded-full border border-line bg-panel text-muted transition-colors duration-fast ease hover:border-ember/40 hover:text-ember sm:mt-[1.875rem]"
              >
                <TrashIcon size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}
