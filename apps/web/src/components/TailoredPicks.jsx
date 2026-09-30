const LABEL = 'font-mono text-[10px] uppercase tracking-[0.18em]';

const SECTIONS = [
  ['experience', 'Experience'],
  ['projects', 'Projects'],
  ['education', 'Education'],
  ['certifications', 'Certifications'],
  ['achievements', 'Achievements'],
];

// Which of the person's own entries the plan puts first, per section, in its
// order: not the reworded bullets themselves, which are in the resume made
// from this plan, since the chat is too narrow for a PDF. The plan leads the
// resume rather than being all of it (see the server's
// resume/tailored-sections.js), so the card says the rest follows.
export default function TailoredPicks({ sections }) {
  const used = SECTIONS.filter(([key]) => (sections?.[key] ?? []).length > 0);
  if (!used.length) {
    return <p className="text-sm text-ink/80">Nothing in your record stood out for this posting, so the resume keeps all of it in your own order.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className={`${LABEL} text-muted`}>Leads the resume for this job</p>
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
      <p className="text-xs text-muted">The rest of your record follows these, as you wrote it.</p>
    </div>
  );
}
