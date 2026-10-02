import { usePopover } from '../lib/usePopover.js';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import TemplatePicker from './TemplatePicker.jsx';
import { PlusIcon } from './Icon.jsx';

// "New" at the head of the document list: the template picker in a
// popover, closed again once a template is picked, since picking is what
// makes the document and opens it.
export default function NewDocumentMenu({ templates, busy, onPick }) {
  const { open, setOpen, ref } = usePopover();

  return (
    <div ref={ref} className="relative">
      <Button
        variant="primary"
        size="sm"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <PlusIcon size={12} />
        New
      </Button>
      {open && (
        <Card variant="pop" as="div" role="dialog" aria-label="Start a new document" className="pop-in absolute left-0 top-full z-30 mt-2 w-80 p-3">
          <TemplatePicker
            templates={templates}
            busy={busy}
            onPick={(template) => {
              setOpen(false);
              onPick(template);
            }}
          />
        </Card>
      )}
    </div>
  );
}
