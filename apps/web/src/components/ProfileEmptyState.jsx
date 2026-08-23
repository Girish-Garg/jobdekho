// A user landing here with nothing needs to know why they would bother
// before being shown a pile of blank inputs.
export default function ProfileEmptyState({ onStart }) {
  return (
    <div className="flex max-w-xl flex-col items-start gap-4 border-t border-line pt-8">
      <h3 className="font-display text-lg font-bold tracking-tight">No profile yet</h3>
      <p className="text-sm leading-relaxed text-muted">
        Your profile is what the Recommended sort on Postings ranks against: the
        skills, target titles, experience and degree you bring. Upload a resume
        above and the fields fill themselves in, or write them yourself. Once it
        is saved you can also use it to seed your notification filter.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-ink"
      >
        Fill it in by hand
      </button>
    </div>
  );
}
