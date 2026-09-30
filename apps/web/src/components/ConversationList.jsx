import { relativeDay } from '../lib/time.js';
import { ChevronRightIcon, HistoryIcon } from './Icon.jsx';

const questions = (count) => (count === 1 ? '1 question' : `${count} questions`);

// The conversations filed away with "New chat", newest first, each named by
// its first question. Opening one shows it whole, read-only (see
// ConversationReader.jsx).
export default function ConversationList({ list, onOpen }) {
  if (list.items === undefined) return <p className="px-2 py-4 text-sm text-muted">Reading your past conversations...</p>;
  if (list.failed) return <p className="px-2 py-4 text-sm text-muted">Your past conversations could not be read. Close History and open it again to retry.</p>;
  if (!list.items.length) {
    return (
      <p className="px-2 py-4 text-sm text-muted">
        No past conversations yet. New chat files the one on screen here, so nothing the AI said is lost.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {list.items.map((conversation) => (
        <li key={conversation.id}>
          <button
            type="button"
            onClick={() => onOpen(conversation.id)}
            className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors duration-fast ease hover:bg-select/50"
          >
            <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <HistoryIcon size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink" title={conversation.title}>{conversation.title}</span>
              <span className="block text-xs text-muted">
                {relativeDay(conversation.endedAt) || 'today'}, {questions(conversation.turnCount)}
              </span>
            </span>
            <ChevronRightIcon className="text-muted transition duration-fast ease group-hover:translate-x-0.5 group-hover:text-ink" />
          </button>
        </li>
      ))}
    </ul>
  );
}
