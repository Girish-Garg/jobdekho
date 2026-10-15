// The stage as a bar to click: the steps passed in green, the one it is at
// in saffron. Closed sits apart under it, since it can follow any step.
const STEPS = [['applied', 'Applied'], ['emailed', 'Emailed'], ['replied', 'Replied'], ['assessment', 'Test'], ['interview', 'Interview'], ['offer', 'Offer']];

export default function TrackerStepper({ stage, onPick }) {
  const at = STEPS.findIndex(([key]) => key === stage);
  const closed = stage === 'closed';
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5" role="group" aria-label="Stage">
        {STEPS.map(([key, word], i) => {
          const tone = closed ? 'muted' : i < at ? 'done' : i === at ? 'now' : 'muted';
          return (
            <button
              key={key}
              type="button"
              aria-pressed={i === at}
              onClick={() => i !== at && onPick(key)}
              className={`flex flex-1 flex-col items-center gap-1.5 text-[11px] font-medium transition-colors duration-fast ${tone === 'now' ? 'text-primary' : tone === 'done' ? 'text-ink/80' : 'text-muted hover:text-ink'}`}
            >
              <span aria-hidden="true" className={`h-1 w-full rounded-full ${tone === 'now' ? 'bg-primary' : tone === 'done' ? 'bg-applied' : 'bg-edge'}`} />
              {word}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => onPick(closed ? 'applied' : 'closed')} className="self-start text-xs font-medium text-muted underline underline-offset-2 hover:text-ink">
        {closed ? 'Closed. Reopen it as Applied' : 'Mark it closed'}
      </button>
    </div>
  );
}
