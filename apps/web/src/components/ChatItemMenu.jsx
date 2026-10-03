import { usePopover } from '../lib/usePopover.js';
import { ACTION_KINDS, ACTION_ORDER } from '../lib/chatActionKinds.js';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import ChatActionIcon from './ChatActionIcon.jsx';

// A row of the menu reads as ink, not as the ghost button's muted words:
// these are the things to do, not ways out.
const ROW = 'justify-start text-ink hover:bg-select/60';

// A job in a comparison or a document's chat, as a menu on its chip: the
// job itself in the pane, its own chat, and its three actions. An action
// pressed here runs in the job's own chat, and this chat keeps a note of it
// (see the server's api/posting-ai.js): the view stays where the person is.
// While another call runs the actions wait, with why as their tooltip.
export default function ChatItemMenu({ name, job, waitReason = null, onOpenJob, onOpenChat, onRun }) {
  const { open, setOpen, ref } = usePopover();
  const act = (fn) => () => {
    setOpen(false);
    fn();
  };

  return (
    <span ref={ref} className="relative min-w-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} title={name} className="block min-w-0 max-w-full truncate text-left">
        {name}
      </button>
      {open && (
        <Card variant="pop" role="group" aria-label={name} className="pop-in absolute left-0 top-full z-40 mt-2 flex w-56 flex-col gap-0.5 p-1.5 font-medium normal-case">
          <Button variant="ghost" size="sm" onClick={act(onOpenJob)} className={ROW}>Show the job</Button>
          <Button variant="ghost" size="sm" onClick={act(onOpenChat)} className={ROW}>Open its own chat</Button>
          {job.listed !== false && ACTION_ORDER.map((kind) => (
            <Button
              key={kind}
              variant="ghost"
              size="sm"
              disabled={Boolean(waitReason)}
              title={waitReason ?? undefined}
              onClick={act(() => onRun(kind))}
              className={ROW}
            >
              <ChatActionIcon kind={kind} size={13} className="text-primary" />
              {ACTION_KINDS[kind].label}
            </Button>
          ))}
        </Card>
      )}
    </span>
  );
}
