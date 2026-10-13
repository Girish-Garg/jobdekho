import { skillOut, withSkill } from '../lib/tailorReview.js';
import TailorHead from './TailorHead.jsx';
import TailorOutChip from './TailorOutChip.jsx';

// Every skill the resume could print, each one click from being in or out:
// the ones the tailoring left out for this job start out, the rest in. A
// skill that goes leaves the Skills rows and every entry's Stack line.
export default function TailorSkills({ skills, choices, onChange }) {
  if (!skills.length) return null;
  const out = skills.filter((skill) => skillOut(choices, skill)).length;
  const asked = skills.some((skill) => skill.asked);

  return (
    <section aria-label="Skills" className="flex flex-col gap-2">
      <TailorHead title="Skills" note={out ? `${out} left out` : 'all in'} />
      <ul className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <TailorOutChip
            key={skill.name}
            name={skill.name}
            lead={skill.asked}
            out={skillOut(choices, skill)}
            onToggle={(out) => onChange(withSkill(choices, skill, !out))}
          />
        ))}
      </ul>
      {asked && <p className="text-xs text-muted">The saffron ones are skills this job asks for.</p>}
    </section>
  );
}
