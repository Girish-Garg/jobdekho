// With no profile the server quietly serves Recommended as newest-first, so
// this banner is the only thing between the user and a ranking that silently
// is not one.
export default function RecommendedNotice({ onOpenProfile }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel px-4 py-3">
      <p className="text-sm text-muted">
        Recommended needs a profile to rank against. Until you make one, this is just the newest postings.
      </p>
      <button
        type="button"
        onClick={onOpenProfile}
        className="rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-ink"
      >
        Set up your profile
      </button>
    </div>
  );
}
