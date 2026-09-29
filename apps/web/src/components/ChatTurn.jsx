import { turnShape } from '../lib/chatTurnShape.js';
import { providerLabel } from '../lib/chatAnswerer.js';
import { relativeDay } from '../lib/time.js';
import ChatBubble from './ChatBubble.jsx';
import ChatAssistant from './ChatAssistant.jsx';
import ChatText from './ChatText.jsx';
import ChatRefs from './ChatRefs.jsx';
import ChatActions from './ChatActions.jsx';
import ChatWebCard from './ChatWebCard.jsx';
import ProposalCard from './ProposalCard.jsx';
import { WarningIcon } from './Icon.jsx';

// One question and its answer. The answer from JobDekho's own data comes
// first, then the changes it offers as cards to apply (the answer says what
// they are, so they sit right under it), then the jobs it named and any
// offer to change the feed, since reading on about one of them is the
// likelier next step. What the web added is a card of its own after all of that, marked as
// the web's, because it was written from a different, public, set of facts.
//
// A search that failed left the answer from the person's own data standing,
// and says why in a quiet line rather than an alarm.
export default function ChatTurn({ turn: saved, providers, onApply, onOpenRef }) {
  const turn = turnShape(saved);
  return (
    <div className="flex flex-col gap-4">
      <ChatBubble>{turn.question}</ChatBubble>
      <ChatAssistant name={providerLabel(providers, turn.provider)} when={relativeDay(turn.createdAt)}>
        {turn.answer && <ChatText text={turn.answer} />}
        {turn.proposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} />)}
        {turn.refs.length > 0 && <ChatRefs refs={turn.refs} onOpen={onOpenRef} />}
        {turn.actions.length > 0 && <ChatActions actions={turn.actions} onApply={onApply} />}
        {turn.web && <ChatWebCard web={turn.web} />}
        {turn.webError && (
          <p className="flex items-start gap-1.5 text-xs text-muted">
            <WarningIcon size={13} className="mt-px text-ember" />
            <span>Could not search the web: {turn.webError}</span>
          </p>
        )}
      </ChatAssistant>
    </div>
  );
}
