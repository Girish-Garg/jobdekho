import { startChatDraft } from '../lib/chatDraftSignal.js';
import Button from './ui/Button.jsx';
import { SparkleIcon } from './Icon.jsx';

// "Add with AI": opens the chat with the start of the request already in
// the box ("Add a project: "), for the person to finish in their own words.
// The chat answers with a card to apply (see ProposalCard.jsx), so nothing
// is added until they press Apply there. A quiet button with the chat's
// sparkle in saffron: one tinted button per section put seven saffron blocks
// on the Profile page, and the sparkle alone says which one asks the AI.
// `where` names the section for a screen reader, since every card has one.
export default function AskAiControl({ prompt = '', where, label = 'Add with AI' }) {
  return (
    <Button
      size="sm"
      onClick={() => startChatDraft(prompt)}
      aria-label={where ? `${label}: ${where}` : label}
      title={`Opens the chat with "${prompt.trim()}" to finish`}
      className="shrink-0 py-1.5"
    >
      <SparkleIcon size={12} className="text-primary" />
      {label}
    </Button>
  );
}
