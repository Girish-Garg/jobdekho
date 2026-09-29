import { relativeDay } from '../lib/time.js';
import { DocumentIcon, MailIcon } from './Icon.jsx';

const GROUPS = [
  ['resume', 'Resumes'],
  ['cover-letter', 'Cover letters'],
];

// Saffron for a resume, teal for a letter, so the two kinds tell apart in
// a long list by colour and by shape, never by colour alone.
const TILE = {
  resume: { Icon: DocumentIcon, tone: 'bg-primary/10 text-primary' },
  'cover-letter': { Icon: MailIcon, tone: 'bg-accent/10 text-accent' },
};

function Row({ doc, here, onSelect }) {
  const { Icon, tone } = TILE[doc.kind] ?? TILE.resume;
  return (
    <button
      type="button"
      aria-current={here ? 'true' : undefined}
      onClick={() => onSelect(doc.id)}
      className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors duration-fast ease ${
        here ? 'bg-select' : 'hover:bg-select/50'
      }`}
    >
      <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}>
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm text-ink ${here ? 'font-semibold' : 'font-medium'}`} title={doc.name}>{doc.name}</span>
        <span className="block text-xs text-muted">Edited {relativeDay(doc.updatedAt) || 'just now'}</span>
      </span>
    </button>
  );
}

// The left column of the Resume workspace: every document the person has,
// resumes first, newest first within each, and the way to start another.
export default function DocumentList({ documents, selectedId, onSelect, newMenu }) {
  return (
    <aside aria-label="Documents" className="flex max-h-56 min-h-0 w-full shrink-0 flex-col border-b border-line bg-panel md:max-h-none md:w-64 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <h2 className="font-display text-md font-bold text-ink">Documents</h2>
        {newMenu}
      </div>
      <nav aria-label="Your documents" className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {GROUPS.map(([kind, title]) => {
          const list = documents.filter((doc) => doc.kind === kind);
          if (!list.length) return null;
          return (
            <div key={kind}>
              <p className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{title}</p>
              <ul className="flex flex-col gap-0.5">
                {list.map((doc) => (
                  <li key={doc.id}><Row doc={doc} here={doc.id === selectedId} onSelect={onSelect} /></li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
