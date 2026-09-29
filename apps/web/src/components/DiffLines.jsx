// A line diff as source, in a box that scrolls on its own so a long one does
// not push the Apply button out of the conversation. Removed lines on an
// ember tint, added on green, folded runs of unchanged lines as one quiet
// row (see lib/foldDiff.js). Long LaTeX lines wrap rather than scroll
// sideways: the chat is narrow, and a line cut off at its edge hides the
// part that changed as often as not.
const LOOK = {
  same: { row: '', mark: '', markTone: 'text-muted', text: 'text-ink/70' },
  add: { row: 'bg-applied/10', mark: '+', markTone: 'text-applied', text: 'text-ink' },
  del: { row: 'bg-ember/10', mark: '-', markTone: 'text-ember', text: 'text-ink/80' },
};

export default function DiffLines({ ops }) {
  return (
    <div aria-label="Changes to the source" role="group" className="max-h-80 overflow-y-auto rounded-lg border border-line bg-paper py-1 font-mono text-[11px] leading-[1.65]">
      {ops.map((line, i) => {
        if (line.op === 'skip') {
          return (
            <p key={i} className="my-1 border-y border-dashed border-line bg-panel px-3 py-0.5 text-muted">
              {line.count} unchanged {line.count === 1 ? 'line' : 'lines'}
            </p>
          );
        }
        const look = LOOK[line.op];
        return (
          <p key={i} data-op={line.op} className={`flex ${look.row}`}>
            <span aria-hidden="true" className={`w-5 shrink-0 select-none text-center font-bold ${look.markTone}`}>{look.mark}</span>
            <span className={`min-w-0 flex-1 whitespace-pre-wrap break-all pr-2 ${look.text}`}>{line.text || ' '}</span>
          </p>
        );
      })}
    </div>
  );
}
