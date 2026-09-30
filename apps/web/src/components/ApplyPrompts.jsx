// What the page asks the person directly, shown over the live view: a file
// (its own Attach button opened a chooser, which JobDekho intercepts so no
// dialog pops up on a window nobody sees) and an alert or confirm the page
// raised. JobDekho answers neither on its own.
function Card({ title, children }) {
  return (
    <div role="dialog" aria-label={title} className="rise rounded-lg border border-line bg-overlay p-4 shadow-pop">
      <p className="mb-3 text-sm font-semibold text-ink">{title}</p>
      {children}
    </div>
  );
}

export function ApplyChooser({ files, onChoose }) {
  const offered = [['resume', 'Resume', files?.resume], ['cover', 'Cover letter', files?.cover]].filter(([, , name]) => name);
  return (
    <Card title="The site asks for a file">
      {offered.length === 0 && (
        <p className="mb-3 text-sm text-muted">JobDekho has no PDF for this application yet. Pop the window out to pick one from this computer.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {offered.map(([choice, what, name]) => (
          <button key={choice} type="button" onClick={() => onChoose(choice)} className="btn btn-primary btn-sm">
            {what}: {name}
          </button>
        ))}
        <button type="button" onClick={() => onChoose('cancel')} className="btn btn-quiet btn-sm">Cancel</button>
      </div>
    </Card>
  );
}

export function ApplyPageDialog({ dialog, onAnswer }) {
  return (
    <Card title="The page says">
      <p className="mb-3 whitespace-pre-wrap text-sm text-ink">{dialog.message || '(no message)'}</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => onAnswer(true)} className="btn btn-primary btn-sm">OK</button>
        {dialog.kind !== 'alert' && <button type="button" onClick={() => onAnswer(false)} className="btn btn-quiet btn-sm">Cancel</button>}
      </div>
    </Card>
  );
}
