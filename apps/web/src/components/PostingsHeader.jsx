import CompanyMark from './CompanyMark.jsx';
import PageTitle from './ui/PageTitle.jsx';

// The feed's title line: what this is, how many postings match and how many
// of them are new today (counted by the server over the whole match, not the
// loaded page), and on the right how to look at them (rows or cards, and the
// order). Those two used to sit in the filter row; filters narrow what is in
// the feed, these only change how it is shown, so they live here.
//
// `fresh` splits "new" the way the chips do: `posted`, the board's own date
// within the last day, in saffron, and `found`, first found today but posted
// earlier, quietly beside it. Counting every first sighting as new would
// say "new today" of jobs a week old.
//
// With one company picked (see CompanySelect.jsx) the feed is that company's
// page: its mark and its name for the title, and the way back to every
// company beside the count. `logoOf` is a posting of its with a stored logo.
const count = (n) => n.toLocaleString('en-IN');

export default function PostingsHeader({
  shown, total = shown, fresh = {}, controls = null, company = null, logoOf = null, onAllCompanies,
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-3 pt-5">
      <div className="flex min-w-0 items-center gap-3">
        {company && <CompanyMark company={company} logoOf={logoOf} />}
        <div className="min-w-0">
          <PageTitle className="truncate">{company ?? 'Postings'}</PageTitle>
          <p className="tnum mt-0.5 text-sm text-muted">
            <span>{total > shown ? `${count(shown)} of ${count(total)} shown` : `${count(total)} postings`}</span>
            {fresh.posted > 0 && <span className="font-medium text-primary">{`  ·  ${count(fresh.posted)} new today`}</span>}
            {fresh.found > 0 && <span>{`  ·  ${count(fresh.found)} found today`}</span>}
            {company && onAllCompanies && (
              <>
                <span aria-hidden="true">{'  ·  '}</span>
                <button
                  type="button"
                  onClick={onAllCompanies}
                  className="font-medium text-ink/80 underline-offset-2 transition-colors duration-fast ease hover:text-primary hover:underline"
                >
                  All companies
                </button>
              </>
            )}
          </p>
        </div>
      </div>
      {controls && <div className="flex flex-wrap items-center justify-end gap-2">{controls}</div>}
    </div>
  );
}
