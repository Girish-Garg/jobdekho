// What is going on in a chat that is not on screen, in the switcher's rows
// and beside the header's name: a saffron dot for an answer not yet seen,
// and a slowly turning ring while its answer runs, the one loop the chat
// allows itself. The words are for a screen reader, since a dot says
// nothing to one.
const WORDS = { unseen: 'New answer', busy: 'Answer running' };

export default function ChatSignal({ mark, label = WORDS[mark] }) {
  if (!mark) return null;
  return (
    <span role="img" aria-label={label} title={label} className="grid h-4 w-4 shrink-0 place-items-center">
      {mark === 'busy' ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary/25 border-t-primary [animation-duration:1.2s] motion-reduce:animate-none" />
      ) : (
        <span className="h-2 w-2 rounded-full bg-primary" />
      )}
    </span>
  );
}
