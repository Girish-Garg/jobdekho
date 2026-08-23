// With no profile the server quietly serves Best fit as newest-first and
// ignores the fit floor, so this banner is the only thing between the user
// and a ranking that silently is not one. When a floor is set the copy names
// the dead filter too: sort-only keeps the concrete "newest postings" line,
// which would be wrong under any other sort.
export default function RecommendedNotice({ onOpenProfile, fitFiltered = false }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel px-4 py-3">
      <p className="text-sm text-muted">
        {fitFiltered
          ? 'Fit needs a profile to score against. Until you make one, the fit filter and the Best fit order both do nothing.'
          : 'Best fit needs a profile to rank against. Until you make one, this is just the newest postings.'}
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
