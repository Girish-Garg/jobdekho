// A user landing here with nothing needs to know why they would bother
// before being shown a pile of blank inputs.
export default function ProfileEmptyState({ onStart }) {
  return (
    <div className="flex max-w-xl flex-col items-start gap-4">
      <h3 className="font-display text-lg font-bold tracking-tight">No profile yet</h3>
      <p className="text-sm leading-relaxed text-muted">
        Your profile is your full career record: experience, projects, education, skills, certifications and
        achievements, each holding as many entries as you need. The skills, target titles, experience and degree
        you bring are what the Best fit ranking on Postings scores against. Upload a resume and fill the record
        in from it, or write it yourself. Once it is saved you can also use it to seed your notification filter.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="rounded-full border border-line px-4 py-1.5 text-sm text-ink transition-colors duration-fast ease-ease hover:border-ink"
      >
        Fill it in by hand
      </button>
    </div>
  );
}
