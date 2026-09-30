import { WarningIcon } from './Icon.jsx';

// Why a document change the chat meant to offer could not be made, in the
// server's own sentence (see its chat/document-edits.js): an edit named
// text the document does not hold, or holds in more than one place, and
// JobDekho does not guess which line of a resume to change. The card stays
// so the person sees what was meant; there is nothing on it to apply.
export default function ProposalRefusal({ reason }) {
  return (
    <p className="flex items-start gap-2 text-sm leading-relaxed text-ink">
      <WarningIcon size={14} className="mt-0.5 text-ember" />
      <span className="min-w-0 flex-1 break-words">{reason || 'The change could not be made. Ask the chat for it again.'}</span>
    </p>
  );
}
