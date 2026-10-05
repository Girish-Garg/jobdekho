import { groupSkillsMissing, MAX_SKILLS } from '../lib/groupSkills.js';
import Button from './ui/Button.jsx';
import Chip from './ui/Chip.jsx';
import { PlusIcon } from './Icon.jsx';

const SHOWN = 12;

// Under the Best fit skills: the skills the groups name that Best fit lacks,
// each one click to add, and as many at once as there is room for. A save
// used to fold them all in unasked (see groupSkills.js).
export default function GroupSkillSuggestions({ skills, skillGroups, onAdd }) {
  const missing = groupSkillsMissing(skills, skillGroups);
  const room = MAX_SKILLS - skills.length;
  if (!missing.length || room <= 0) return null;
  const many = Math.min(missing.length, room);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted">From your skill groups:</span>
      {missing.slice(0, SHOWN).map((skill) => (
        <Chip
          as="button"
          key={skill}
          type="button"
          tone="quiet"
          onClick={() => onAdd([skill])}
          aria-label={`Add ${skill} to Best fit`}
          className="cursor-pointer transition-colors duration-fast hover:bg-primary/10 hover:text-primary"
        >
          <PlusIcon size={10} />
          {skill}
        </Chip>
      ))}
      {missing.length > SHOWN && <span className="text-xs text-muted">and {missing.length - SHOWN} more</span>}
      {missing.length > 1 && (
        <Button size="sm" variant="ghost" onClick={() => onAdd(missing.slice(0, many))} className="font-medium">
          {many === missing.length ? 'Add all' : `Add ${many}`}
        </Button>
      )}
    </div>
  );
}
