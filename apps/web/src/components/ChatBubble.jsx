// What the person said, on the right like any conversation they have read
// before, with the tail corner squared so the bubble points at its speaker.
// A raised neutral bubble rather than a saffron one, since saffron is kept
// for what can be pressed.
// `note` is a small line above it: what an instruction is about to change.
export default function ChatBubble({ note, rise = false, children }) {
  return (
    <div className={`flex flex-col items-end gap-1 pl-10 ${rise ? 'rise' : ''}`}>
      {note && <p className="text-xs text-muted">{note}</p>}
      <p className="max-w-full whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-select px-3.5 py-2 text-base text-ink ring-1 ring-inset ring-line">
        {children}
      </p>
    </div>
  );
}
