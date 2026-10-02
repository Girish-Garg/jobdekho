import Card from './ui/Card.jsx';
import Eyebrow from './ui/Eyebrow.jsx';
import { DocumentIcon, MailIcon } from './Icon.jsx';

// The document the conversation is about on the Resume page, named where
// the conversation starts, the way ChatScopeCard.jsx names a job on the
// feed. There is nothing to clear: the open document IS the scope, and
// opening another one in the list is how to change it.
export default function ChatDocumentScope({ doc }) {
  const letter = doc.kind === 'cover-letter';
  const Icon = letter ? MailIcon : DocumentIcon;
  return (
    <div className="shrink-0 border-b border-line px-3 py-2.5">
      <Card variant="inset" className="flex items-center gap-3 bg-paper p-2">
        <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${letter ? 'bg-select text-ink' : 'bg-primary/10 text-primary'}`}>
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <Eyebrow primary>Working on</Eyebrow>
          <p className="truncate text-sm font-semibold text-ink" title={doc.name}>{doc.name}</p>
        </div>
      </Card>
    </div>
  );
}
