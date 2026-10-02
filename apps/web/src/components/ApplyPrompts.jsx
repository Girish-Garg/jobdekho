import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';

// What the page asks the person directly, shown over the live view: a file
// (its own Attach button opened a chooser, which JobDekho intercepts so no
// dialog pops up on a window nobody sees) and an alert or confirm the page
// raised. JobDekho answers neither on its own.
function Prompt({ title, children }) {
  return (
    <Card variant="pop" role="dialog" aria-label={title} className="rise rounded-lg p-4">
      <p className="mb-3 text-sm font-semibold text-ink">{title}</p>
      {children}
    </Card>
  );
}

export function ApplyChooser({ files, onChoose }) {
  const offered = [['resume', 'Resume', files?.resume], ['cover', 'Cover letter', files?.cover]].filter(([, , name]) => name);
  return (
    <Prompt title="The site asks for a file">
      {offered.length === 0 && (
        <p className="mb-3 text-sm text-muted">JobDekho has no PDF for this application yet. Pop the window out to pick one from this computer.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {offered.map(([choice, what, name]) => (
          <Button key={choice} variant="primary" size="sm" onClick={() => onChoose(choice)}>
            {what}: {name}
          </Button>
        ))}
        <Button variant="quiet" size="sm" onClick={() => onChoose('cancel')}>Cancel</Button>
      </div>
    </Prompt>
  );
}

export function ApplyPageDialog({ dialog, onAnswer }) {
  return (
    <Prompt title="The page says">
      <p className="mb-3 whitespace-pre-wrap text-sm text-ink">{dialog.message || '(no message)'}</p>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={() => onAnswer(true)}>OK</Button>
        {dialog.kind !== 'alert' && <Button variant="quiet" size="sm" onClick={() => onAnswer(false)}>Cancel</Button>}
      </div>
    </Prompt>
  );
}
