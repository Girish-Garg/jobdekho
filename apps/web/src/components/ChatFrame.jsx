import ChatResizeHandle from './ChatResizeHandle.jsx';

// Where the panel sits (see lib/useChatLayout.js). Floating, it is a card
// inset from the left of the page area, the mirror of the job pane on the
// right, so opening it never reflows what is under the reader's eye.
// Pinned, it is a flush column in the same row as the page, which makes room
// beside it and scrolls on its own. On a narrow window it covers the page,
// with nothing to pin or drag.
//
// `beside` is what the chat opens next to itself (the resume builder), told
// where the panel ends through a CSS variable, so it starts there at
// whatever width the panel has been dragged to.
const INSET = 12;
const PLACE = {
  narrow: 'absolute inset-0 z-30 w-full shadow-pop',
  floating: 'absolute bottom-3 left-3 top-3 z-30 rounded-2xl border border-line shadow-pop',
  pinned: 'relative z-20 shrink-0 border-r border-line',
};

export default function ChatFrame({ layout, beside = null, children }) {
  const mode = !layout.wide ? 'narrow' : layout.pinned ? 'pinned' : 'floating';
  const edge = mode === 'narrow' ? 0 : layout.width + (mode === 'floating' ? INSET : 0);
  return (
    <>
      <aside
        aria-label="Ask AI"
        data-mode={mode}
        style={layout.wide ? { width: layout.width } : undefined}
        className={`slide-in-left flex min-h-0 flex-col bg-panel ${PLACE[mode]}`}
      >
        {children}
        {layout.wide && (
          <ChatResizeHandle width={layout.width} min={layout.min} max={layout.max} rounded={mode === 'floating'} onResize={layout.setWidth} />
        )}
      </aside>
      {beside && <div className="contents" style={{ '--chat-width': `${edge}px` }}>{beside}</div>}
    </>
  );
}
