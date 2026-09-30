import { startChatDraft } from '../lib/chatDraftSignal.js';
import { SparkleIcon } from './Icon.jsx';

// "Add with AI": opens the chat with the start of the request already in
// the box ("Add a project: "), for the person to finish in their own words.
// The chat answers with a card to apply (see ProposalCard.jsx), so nothing
// is added until they press Apply there. Saffron with the chat's sparkle,
// since this is now the quick way in; the hand-typed Add beside it stays.
// `where` names the section for a screen reader, since every card has one.
export default function AskAiControl({ prompt = '', where, label = 'Add with AI' }) {
  return (
    <button
      type="button"
      onClick={() => startChatDraft(prompt)}
      aria-label={where ? `${label}: ${where}` : label}
      title={`Opens the chat with "${prompt.trim()}" to finish`}
      className="btn btn-tint btn-sm shrink-0 px-3 py-1.5"
    >
      <SparkleIcon size={12} />
      {label}
    </button>
  );
}
