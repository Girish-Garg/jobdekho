import { usePopover } from '../lib/usePopover.js';
import { chatHeading } from '../lib/chatNames.js';
import { Caret } from './Dropdown.jsx';
import ChatMark from './ChatMark.jsx';
import ChatSignal from './ChatSignal.jsx';
import ChatSwitcherMenu from './ChatSwitcherMenu.jsx';
import ChatHeaderButtons from './ChatHeaderButtons.jsx';

// Which CLI will answer: the person pays for it on their own subscription,
// so it is named rather than left as "AI". The dot by the chat's kind is
// its state, found, still looking, or nothing that can answer, with the
// words in its tooltip and for a screen reader.
function status(providers, answerer) {
  // "on this PC" rather than "on this computer": the panel's header is narrow.
  if (answerer) return { text: `${answerer.label} on this PC`, dot: 'bg-applied' };
  if (!Array.isArray(providers)) return { text: 'Looking for an AI CLI on this computer...', dot: 'bg-muted breathe' };
  return { text: 'No AI CLI found on this computer', dot: 'bg-ember' };
}

// The panel's title row (picked from rendered option A): the chat's name is
// a menu of every chat (see ChatSwitcherMenu.jsx), with a dot or a ring by
// it while another chat has an answer waiting or running (`signal`). Under
// it, when the page has a job or a document open whose chat is not the one
// on screen, a link to that chat (`other`).
export default function ChatHeader({ view, providers, answerer, signal, switcher, active, layout, onNew, onClose }) {
  const { open, setOpen, ref } = usePopover();
  const { title, about } = chatHeading(view);
  const now = status(providers, answerer);
  const close = (act) => (...args) => {
    setOpen(false);
    act(...args);
  };

  return (
    <div ref={ref} className="relative shrink-0 border-b border-line">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={`${title}, switch chats`}
          onClick={() => setOpen(!open)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left"
        >
          <ChatMark view={view} />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5 text-ink">
              <span className="truncate font-display text-md font-bold leading-tight" title={title}>{title}</span>
              <Caret open={open} />
              <ChatSignal mark={signal} label={signal === 'busy' ? 'Another chat is running' : 'Another chat has a new answer'} />
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <span aria-hidden="true" title={now.text} className={`h-1.5 w-1.5 shrink-0 rounded-full ${now.dot}`} />
              <span className="truncate">{about}</span>
              <span className="sr-only">{now.text}</span>
            </span>
          </span>
        </button>
        <ChatHeaderButtons active={active} layout={layout} onNew={close(onNew)} onClose={onClose} />
      </div>
      {active.other && (
        <div className="-mt-1.5 px-4 pb-2.5 pl-16">
          <button type="button" onClick={() => active.pick(active.other.chatId)} className="link text-xs">
            Open {active.other.item.company || active.other.item.title || active.other.item.name}&apos;s chat
          </button>
        </div>
      )}
      {open && (
        <ChatSwitcherMenu
          {...switcher}
          current={view}
          onPick={close(switcher.onPick)}
          onNew={close(onNew)}
          onClear={close(switcher.onClear)}
          onDelete={close(switcher.onDelete)}
        />
      )}
    </div>
  );
}
