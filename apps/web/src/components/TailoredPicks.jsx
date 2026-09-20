const LABEL = 'font-mono text-[10px] uppercase tracking-[0.18em]';

const SECTIONS = [
  ['experience', 'Experience'],
  ['projects', 'Projects'],
  ['education', 'Education'],
  ['certifications', 'Certifications'],
  ['achievements', 'Achievements'],
];

// Which of the person's own entries the plan picked, per section, in the
// order it put them: not the reworded bullets themselves, which live in the
// resume builder once opened - this pane is too narrow for a PDF, so it only
// has to say what got chosen before the person decides whether to open it.
export default function TailoredPicks({ sections }) {
  const used = SECTIONS.filter(([key]) => (sections?.[key] ?? []).length > 0);
  if (!used.length) {
    return <p className="text-sm text-ink/80">Nothing in your career record fit this posting closely enough to pick.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className={`${LABEL} text-muted`}>Picked for this job</p>
      {used.map(([key, title]) => (
        <div key={key}>
          <p className="text-sm font-semibold text-ink">{title}</p>
          <ul className="text-sm text-ink/80">
            {sections[key].map((entry) => (
              <li key={entry.id}>
                {entry.title || 'Untitled'}
                {entry.organisation && <span className="text-muted"> at {entry.organisation}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
