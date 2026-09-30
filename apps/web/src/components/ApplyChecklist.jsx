import ApplyChecklistRow from './ApplyChecklistRow.jsx';

// Every question on the page JobDekho can see, in page order, with a count
// of what is still the person's. Hovering a row picks its outline out in the
// live view.
export default function ApplyChecklist({ rows = [], onHover }) {
  const left = rows.filter((row) => row.status === 'you' || row.status === 'failed').length;
  const filled = rows.filter((row) => ['filled', 'attached'].includes(row.status)).length;

  if (rows.length === 0) {
    return <p className="px-2 py-3 text-sm text-muted">No form fields on this page yet.</p>;
  }

  return (
    <section aria-label="What is on this page" className="flex min-h-0 flex-col gap-2">
      <p className="px-2 text-xs text-muted">
        <span className="font-semibold text-applied">{filled} filled</span>
        {' by JobDekho, '}
        <span className={left ? 'font-semibold text-primary' : ''}>{left} left for you</span>
      </p>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {rows.map((row) => (
          <ApplyChecklistRow key={row.fid} row={row} onHover={onHover} />
        ))}
      </ul>
    </section>
  );
}
