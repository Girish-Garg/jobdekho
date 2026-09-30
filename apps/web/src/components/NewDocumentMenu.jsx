import { usePopover } from '../lib/usePopover.js';
import TemplatePicker from './TemplatePicker.jsx';
import { PlusIcon } from './Icon.jsx';

// "New" at the head of the document list: the template picker in a
// popover, closed again once a template is picked, since picking is what
// makes the document and opens it.
export default function NewDocumentMenu({ templates, busy, onPick }) {
  const { open, setOpen, ref } = usePopover();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="btn btn-primary btn-sm"
      >
        <PlusIcon size={12} />
        New
      </button>
      {open && (
        <div role="dialog" aria-label="Start a new document" className="pop-in absolute left-0 top-full z-30 mt-2 w-80 rounded-2xl border border-line bg-overlay p-3 shadow-pop">
          <TemplatePicker
            templates={templates}
            busy={busy}
            onPick={(template) => {
              setOpen(false);
              onPick(template);
            }}
          />
        </div>
      )}
    </div>
  );
}
