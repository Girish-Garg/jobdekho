const LABEL = 'font-mono text-[10px] uppercase tracking-[0.18em]';

// What each flag type means, in the person's words. The server found these
// by comparing the rewrite with the original in code, so they are shown as
// findings and not as the model's opinion. Emphasis is by weight, not colour:
// ember is for errors, and a rewrite that needs checking is not one.
const MEANING = {
  number: 'a number your original does not have',
  skill: 'a skill your resume does not show',
  name: 'a name your original does not have',
};

export default function ResumeFactCheck({ factCheck }) {
  const flags = factCheck?.flags ?? [];
  if (!flags.length) {
    return <p className="text-sm text-ink/80">Nothing in the rewrite is missing from your original resume.</p>;
  }

  return (
    <div>
      <p className="font-display text-base font-bold tracking-tight">Check these before using it</p>
      <p className="mt-0.5 text-sm text-ink/80">
        {flags.length === 1 ? 'One thing' : `${flags.length} things`} in the rewrite that your original resume does not have.
        Fix or remove each one in the resume made from this, on the Resume page.
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {flags.map((flag, i) => (
          <li key={`${flag.type}:${flag.value}:${i}`} className="text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold text-ink">{flag.value}</span>
              <span className={`${LABEL} text-muted`}>{MEANING[flag.type] || 'not in your original'}</span>
            </div>
            {flag.context && <p className="text-ink/80">{flag.context}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
