import { SparkleIcon } from './Icon.jsx';

// With no profile the server quietly serves Best fit as newest-first and
// ignores the fit floor, so this banner is the only thing between the user
// and a ranking that silently is not one. When a floor is set the copy names
// the dead filter too: sort-only keeps the concrete "newest postings" line,
// which would be wrong under any other sort. Saffron, since it asks for the
// one step that makes the rest of the feed work.
export default function RecommendedNotice({ onOpenProfile, fitFiltered = false }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
      <p className="flex items-start gap-2.5 text-sm text-ink/85">
        <SparkleIcon size={15} className="mt-0.5 text-primary" />
        <span>
          {fitFiltered
            ? 'Fit needs a profile to score against. Until you make one, the fit filter and the Best fit order both do nothing.'
            : 'Best fit needs a profile to rank against. Until you make one, this is just the newest postings.'}
        </span>
      </p>
      <button
        type="button"
        onClick={onOpenProfile}
        className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary transition-colors duration-fast ease hover:bg-primary/90"
      >
        Set up your profile
      </button>
    </div>
  );
}
