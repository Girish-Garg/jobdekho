import ChatTurn from './ChatTurn.jsx';
import ChatNoteTurn from './ChatNoteTurn.jsx';
import ChatCombinedTurn from './ChatCombinedTurn.jsx';
import ChatResultEntry from './ChatResultEntry.jsx';

// One entry of a chat's transcript (see lib/conversation.js), drawn by what
// it is: a question and its answer, a note that a job action ran in the
// job's own chat, a comparison's own action with its card, or one of the
// job's results asked for in this chat.
export default function ChatEntry({ entry, jobs, card, links }) {
  if (entry.type === 'result') return <ChatResultEntry entry={entry} card={card} />;
  const { turn } = entry;
  if (turn.note) return <ChatNoteTurn note={turn.note} jobs={jobs} onOpenChat={links.onOpenChat} />;
  if (turn.combined) return <ChatCombinedTurn turn={turn} jobs={jobs} providers={card.providers} links={links} />;
  return <ChatTurn turn={turn} providers={card.providers} onApply={links.onApply} onOpenRef={links.onOpenRef} />;
}
