import Eyebrow from './ui/Eyebrow.jsx';
import TemplateThumb from './TemplateThumb.jsx';

const GROUPS = [
  ['resume', 'Resume'],
  ['cover-letter', 'Cover letter'],
];

// The layouts a new document can start from, resumes then the letter, each
// with a thumbnail of its page and the one line the server gives it. A
// first draft is made from the profile with no AI call (see the server's
// documents/first-draft.js), so picking one is instant and free. On the
// page itself (`wide`) a card sits on the textured ground and takes the
// raised surface; in the New popover it sits on the overlay already.
export default function TemplatePicker({ templates, busy = false, onPick, wide = false }) {
  if (!templates.length) return <p className="text-sm text-muted">Loading templates...</p>;

  return (
    <div className="flex flex-col gap-4">
      {GROUPS.map(([kind, title]) => {
        const list = templates.filter((t) => t.kind === kind);
        if (!list.length) return null;
        return (
          <div key={kind}>
            <Eyebrow className="mb-2">{title}</Eyebrow>
            <ul className={`grid gap-2 ${wide ? 'sm:grid-cols-2' : ''}`}>
              {list.map((template) => (
                <li key={template.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onPick(template)}
                    className={`group flex w-full items-center gap-3 rounded-xl border border-line p-2.5 text-left transition-colors duration-fast ease hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60 ${wide ? 'bg-panel shadow-raise' : 'bg-paper'}`}
                  >
                    <TemplateThumb id={template.id} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink group-hover:text-primary">{template.name}</span>
                      <span className="block text-xs leading-snug text-muted">{template.description}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
