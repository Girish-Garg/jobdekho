import CompanyMark from './CompanyMark.jsx';

// The feed's title line: what this is, how many postings match and how many
// of them arrived today (counted by the server over the whole match, not the
// loaded page), and on the right how to look at them (rows or cards, and the
// order). Those two used to sit in the filter row; filters narrow what is in
// the feed, these only change how it is shown, so they live here.
//
// With one company picked (see CompanySelect.jsx) the feed is that company's
// page: its mark and its name for the title, and the way back to every
// company beside the count. `logoOf` is a posting of its with a stored logo.
const count = (n) => n.toLocaleString('en-IN');

export default function PostingsHeader({ shown, total = shown, fresh, controls = null, company = null, logoOf = null, onAllCompanies }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-3 pt-5">
      <div className="flex min-w-0 items-center gap-3">
        {company && <CompanyMark company={company} logoOf={logoOf} />}
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-extrabold tracking-tight text-ink">{company ?? 'Postings'}</h1>
          <p className="tnum mt-0.5 text-sm text-muted">
            <span>{total > shown ? `${count(shown)} of ${count(total)} shown` : `${count(total)} postings`}</span>
            {fresh > 0 && <span className="font-medium text-primary">{`  ·  ${fresh} new today`}</span>}
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
