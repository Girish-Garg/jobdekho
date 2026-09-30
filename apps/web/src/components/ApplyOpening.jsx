import ApplyCopyPanel from './ApplyCopyPanel.jsx';

// What the panel shows before there is a live view: opening, a session for
// another posting still open (the person decides whether to close it), the
// browser failing to start, or a window closed from elsewhere. Every one of
// them keeps the way through in reach: the person's own browser and their
// details to copy.
export default function ApplyOpening({ apply, posting, onClose, onOwnBrowser }) {
  const { status, error, other } = apply;
  const title = {
    opening: 'Opening the application in a browser of its own...',
    conflict: 'Another application is still open',
    failed: 'Apply assist could not open this one',
    closed: 'The application window has closed',
  }[status] ?? '';

  return (
    <div className="rise mx-auto flex w-full max-w-xl flex-col gap-4 overflow-y-auto py-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        {status === 'conflict' && other && (
          <p className="text-sm text-muted">{`It is open for another posting. Closing it ends that application's browser, and anything not submitted there is lost.`}</p>
        )}
        {status === 'failed' && <p className="text-sm text-muted">{error}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {status === 'conflict' && <button type="button" onClick={apply.replace} className="btn btn-primary">Close that one and open this</button>}
        {status === 'closed' && <button type="button" onClick={apply.replace} className="btn btn-primary">Open it again</button>}
        {status !== 'opening' && <button type="button" onClick={onOwnBrowser} className="btn btn-quiet">Open in my browser</button>}
        <button type="button" onClick={onClose} className="btn btn-ghost">Close</button>
      </div>
      {status !== 'opening' && <ApplyCopyPanel postingId={posting.id} />}
    </div>
  );
}
