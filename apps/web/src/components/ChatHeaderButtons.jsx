import IconButton from './ui/IconButton.jsx';
import { CloseIcon, DockIcon, PinIcon, PlusIcon } from './Icon.jsx';

// A button that is on (the pin, a docked panel) is a saffron wash that stays
// saffron under the pointer, a shade deeper, rather than turning to the grey
// every other icon button takes.
const ON = 'bg-primary/10 text-primary hover:bg-primary/15';

function HeaderButton({ label, lit = false, pressed, onClick, children }) {
  return (
    <IconButton label={label} title={label} size="md" square aria-pressed={pressed} onClick={onClick} className={lit ? ON : ''}>
      {children}
    </IconButton>
  );
}

// The header's own controls: the pin, which keeps the chat on screen while
// the person browses other jobs or documents (see activeChat.js); a new
// general chat; where the panel sits, only on a window wide enough to have
// a choice and not on a page that docks it (see useChatLayout.js); and the
// way out. The pin is a toggle under one name; where the panel sits says
// what pressing it will do, as it always has.
export default function ChatHeaderButtons({ active, layout, onNew, onClose }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <HeaderButton label="Keep this chat on screen" lit={active.pinned} pressed={active.pinned} onClick={active.togglePin}>
        <PinIcon size={16} />
      </HeaderButton>
      <HeaderButton label="New chat" onClick={onNew}><PlusIcon size={16} /></HeaderButton>
      {layout.wide && !layout.docked && (
        <HeaderButton label={layout.pinned ? 'Float over the page' : 'Dock beside the page'} lit={layout.pinned} onClick={layout.togglePinned}>
          <DockIcon size={16} />
        </HeaderButton>
      )}
      <HeaderButton label="Close the chat" onClick={onClose}><CloseIcon size={16} /></HeaderButton>
    </div>
  );
}
