import { providerLabel } from '../lib/chatAnswerer.js';
import { relativeDay } from '../lib/time.js';
import ChatBubble from './ChatBubble.jsx';
import ChatAssistant from './ChatAssistant.jsx';
import ChatText from './ChatText.jsx';
import TailorAllCard from './TailorAllCard.jsx';
import LettersEachCard from './LettersEachCard.jsx';

// A comparison's own action as a turn of it, at the point it was asked
// for: what was pressed, as the person's own bubble, then the line saying
// what came of it and the card with the way to each thing it made.
export default function ChatCombinedTurn({ turn, jobs, providers, links }) {
  const { combined } = turn;
  return (
    <div className="flex flex-col gap-4">
      <ChatBubble>{turn.question}</ChatBubble>
      <ChatAssistant name={providerLabel(providers, turn.provider)} when={relativeDay(turn.createdAt)}>
        {turn.answer && <ChatText text={turn.answer} />}
        {combined.kind === 'tailor-all' && (
          <TailorAllCard combined={combined} jobs={jobs} onOpenDocument={links.onOpenDocument} onOpenChat={links.onOpenChat} />
        )}
        {combined.kind === 'letters-each' && <LettersEachCard combined={combined} onOpenChat={links.onOpenChat} />}
      </ChatAssistant>
    </div>
  );
}
