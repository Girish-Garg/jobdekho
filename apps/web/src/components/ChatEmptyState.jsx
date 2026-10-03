import { chatSuggestions } from '../lib/chatSuggestions.js';
import ChatAvatar from './ChatAvatar.jsx';
import { ArrowRightIcon } from './Icon.jsx';

// A chat with nothing in it yet: what it can be asked here, and a few
// questions it answers well that send on one click. The words follow the
// kind of chat, its job, and for a general chat the page (see
// lib/chatSuggestions.js).
export default function ChatEmptyState({ page, posting, kind = null, loading, busy, onSend }) {
  const { title, intro, questions } = chatSuggestions({ page, posting, kind });
  return (
    <div className="rise my-auto flex flex-col items-center py-6 text-center">
      <ChatAvatar size="lg" />
      <h3 className="mt-5 font-display text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-[19rem] text-sm text-muted">
        {loading ? (posting ? 'Looking for earlier answers about this job...' : 'Opening the chat...') : intro}
      </p>
      <ul aria-label="Suggested questions" className="mt-6 flex w-full max-w-md flex-col gap-2">
        {questions.map((question) => (
          <li key={question}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSend(question)}
              className="group flex w-full items-center gap-3 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-left text-sm font-medium text-ink transition-colors duration-fast ease hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
            >
              <span className="min-w-0 flex-1">{question}</span>
              <ArrowRightIcon className="text-muted transition duration-fast ease group-hover:translate-x-0.5 group-hover:text-primary" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
