const NOTE = 'mt-3 text-sm text-muted';
const BAR = 'block h-3 animate-pulse rounded-full bg-line';

// How fetching a missing description is going, in the description's own
// place. While the board is asked: a few quiet placeholder lines where no
// snippet stands in, and one calm line saying so. Afterwards, only when it
// failed: LinkedIn switched off, with the way to Settings where it is
// turned on, or the server's own sentence for why not (a paused LinkedIn,
// a board with nothing to give). The fetch is asked for once per posting
// (see lib/postingDetails.js), so nothing here tries again.
export default function DescribeNote({ status, refusal, placeholder = false, onOpenSettings }) {
  if (status === 'describing') {
    return (
      <div aria-live="polite">
        {placeholder && (
          <span aria-hidden="true" className="mb-4 flex flex-col gap-2.5">
            <span className={`${BAR} w-11/12`} />
            <span className={`${BAR} w-4/5`} />
            <span className={`${BAR} w-2/3`} />
          </span>
        )}
        <p className={`breathe ${placeholder ? 'text-sm text-muted' : NOTE}`}>Fetching the full description from the board...</p>
      </div>
    );
  }
  if (!refusal) return null;
  if (refusal.status === 403) {
    return (
      <p className={NOTE}>
        {refusal.message || 'LinkedIn is switched off in Settings.'}
        {onOpenSettings && (
          <>
            {' '}
            <button type="button" onClick={onOpenSettings} className="link">Open Settings</button>
          </>
        )}
      </p>
    );
  }
  return <p className={NOTE}>{refusal.message || 'Could not fetch the description right now.'}</p>;
}
