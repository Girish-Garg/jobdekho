import { useState } from 'react';
import { relativeDay } from '../lib/time.js';
import { rowState, rowTitle } from '../lib/chatGroups.js';
import IconButton from './ui/IconButton.jsx';
import ChatMark from './ChatMark.jsx';
import ChatSignal from './ChatSignal.jsx';
import ChatConfirm from './ChatConfirm.jsx';
import { TrashIcon } from './Icon.jsx';

// One chat in the switcher: what it is about, what is going on in it (a
// dot for an answer not yet seen, a ring while one runs), and a way to
// delete it, which asks first. The chat on screen is the lit row. A chat
// not made yet has nothing to delete.
export default function ChatSwitcherRow({ view, current, busy, unseen, onPick, onDelete }) {
  const [asking, setAsking] = useState(false);
  const { text, mark } = rowState(view, { busy, unseen, when: relativeDay(view.updatedAt) });
  const title = rowTitle(view);

  if (asking) {
    return (
      <li className="rounded-xl bg-select/60 px-2 py-2">
        <ChatConfirm
          question={`Delete "${title}"? Its messages go; saved letters, checks and documents stay.`}
          yes="Delete it"
          onYes={() => {
            setAsking(false);
            onDelete(view);
          }}
          onNo={() => setAsking(false)}
        />
      </li>
    );
  }

  return (
    <li className={`group flex items-center gap-1 rounded-xl pr-1 transition-colors duration-fast ease ${current ? 'bg-select' : 'hover:bg-select/50'}`}>
      <button
        type="button"
        aria-current={current ? 'true' : undefined}
        onClick={() => onPick(view.id)}
        className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2 text-left"
      >
        <ChatMark view={view} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink" title={title}>{title}</span>
          <span className="block truncate text-xs text-muted">{text}</span>
        </span>
        <ChatSignal mark={mark} />
      </button>
      {!view.placeholder && (
        <IconButton
          label={`Delete ${title}`}
          title="Delete this chat"
          size="sm"
          tone="danger"
          onClick={() => setAsking(true)}
          className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <TrashIcon size={13} />
        </IconButton>
      )}
    </li>
  );
}
