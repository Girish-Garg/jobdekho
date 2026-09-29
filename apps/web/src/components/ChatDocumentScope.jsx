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
      <div className="flex items-center gap-3 rounded-xl border border-line bg-paper px-2 py-2">
        <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${letter ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Working on</p>
          <p className="truncate text-sm font-semibold text-ink" title={doc.name}>{doc.name}</p>
        </div>
      </div>
    </div>
  );
}
