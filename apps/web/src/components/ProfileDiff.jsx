// What a profile proposal would change, one row per field or entry, as the
// server wrote it from the record itself (see the server's chat/profile-ops-
// diff.js): the old value on an ember tint, the new one on green, a changed
// value as both, one over the other. An entry's bullets arrive as "- ..."
// lines and are drawn as a list under its first line.
const BLOCK = {
  add: { tint: 'bg-applied/10', mark: '+', markTone: 'text-applied', text: 'text-ink', said: 'Added' },
  remove: { tint: 'bg-ember/10', mark: '-', markTone: 'text-ember', text: 'text-ink/75', said: 'Removed' },
};

function Line({ line, first }) {
  if (line.startsWith('- ')) {
    return (
      <p className="flex gap-2 pl-0.5">
        <span aria-hidden="true" className="text-muted">&bull;</span>
        <span className="min-w-0 flex-1">{line.slice(2)}</span>
      </p>
    );
  }
  return <p className={first ? 'font-medium' : ''}>{line}</p>;
}

function Block({ tone, lines }) {
  const look = BLOCK[tone];
  return (
    <div data-change={tone} className={`flex gap-2 rounded-lg px-2.5 py-1.5 ${look.tint}`}>
      <span aria-hidden="true" className={`w-2.5 shrink-0 font-mono text-sm font-bold leading-5 ${look.markTone}`}>{look.mark}</span>
      <div className={`flex min-w-0 flex-1 flex-col gap-0.5 break-words text-sm leading-5 ${look.text}`}>
        <span className="sr-only">{look.said}: </span>
        {lines.map((line, i) => <Line key={i} line={line} first={i === 0} />)}
      </div>
    </div>
  );
}

export default function ProfileDiff({ diff }) {
  if (!diff.length) return <p className="text-sm text-muted">This change has nothing left to show.</p>;
  return (
    <ul aria-label="What changes" className="flex flex-col gap-3">
      {diff.map((row, i) => (
        <li key={`${row.label}:${i}`} className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-muted">{row.label}</p>
          {row.before.length > 0 && <Block tone="remove" lines={row.before} />}
          {row.after.length > 0 && <Block tone="add" lines={row.after} />}
        </li>
      ))}
    </ul>
  );
}
