import Eyebrow from './ui/Eyebrow.jsx';
import TailorOutChip from './TailorOutChip.jsx';
import { withListed } from '../lib/tailorReview.js';

function Row({ title, note, children }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-ink">
        <span className="font-semibold">{title}</span>
        {note && <span className="text-muted"> {note}</span>}
      </p>
      <ul className="flex flex-wrap gap-1.5">{children}</ul>
    </div>
  );
}

// What the tailoring leaves out of the resume for this job: skills the
// posting has no use for, and projects that do not help. Each is one click
// from being back in, and a project kept only so the section is not thin is
// one click from being out; the resume made from the plan follows whatever
// is chosen here. A plan from before plans left anything out has no
// `leftOut`, and then this draws nothing.
export default function TailorLeftOut({ leftOut, choices, onChange }) {
  if (!leftOut) return null;
  const { skills = [], projects = [], fill = [] } = leftOut;
  if (!skills.length && !projects.length && !fill.length) {
    return <p className="text-sm text-ink/80">Nothing was left out: every skill and project you list is in.</p>;
  }
  const flipped = (id) => choices.projects.includes(id);

  return (
    <div className="flex flex-col gap-2">
      <Eyebrow mono>Left out for this job</Eyebrow>
      {skills.length > 0 && (
        <Row title="Skills" note="this job does not ask for">
          {skills.map((skill) => (
            <TailorOutChip key={skill} name={skill} out={!choices.skills.includes(skill)} onToggle={(out) => onChange(withListed(choices, 'skills', skill, out))} />
          ))}
        </Row>
      )}
      {projects.length > 0 && (
        <Row title="Projects" note="that do not help here">
          {projects.map((project) => (
            <TailorOutChip key={project.id} name={project.title || 'Untitled'} out={!flipped(project.id)} onToggle={(out) => onChange(withListed(choices, 'projects', project.id, out))} />
          ))}
        </Row>
      )}
      {fill.length > 0 && (
        <Row title="Projects kept anyway" note="so the section is not thin">
          {fill.map((project) => (
            <TailorOutChip key={project.id} name={project.title || 'Untitled'} out={flipped(project.id)} onToggle={(out) => onChange(withListed(choices, 'projects', project.id, !out))} />
          ))}
        </Row>
      )}
    </div>
  );
}
