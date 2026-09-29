// The index of the record: one line per section with its count, the one
// being read marked. A column in the rail; a row that scrolls sideways in
// the strip below 1100px. Real in-page links, so the sections can be
// reached by keyboard, with the jump done by hand because the record
// scrolls inside <main>, which a bare hash would not offset for.
export default function ProfileIndex({ rows, current, onJump, horizontal = false }) {
  if (rows.length === 0) return null;

  return (
    <nav aria-label="Sections">
      <ol className={horizontal ? 'flex gap-1 overflow-x-auto' : 'flex flex-col'}>
        {rows.map((row) => {
          const here = row.id === current;
          return (
            <li key={row.id} className="shrink-0">
              <a
                href={`#${row.id}`}
                aria-current={here ? 'location' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  onJump(row.id);
                }}
                className={linkClass(horizontal, here)}
              >
                <span>{row.label}</span>
                {row.count != null && <span className="tnum rounded-full bg-select px-1.5 text-[11px] font-semibold">{row.count}</span>}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// The section being read is a tinted pill in the column, the same tint the
// topbar gives the page being viewed, and an ink rule under the word in the
// strip; weight marks it too, so it never rests on colour alone.
function linkClass(horizontal, here) {
  const base = 'flex items-center transition-colors duration-fast ease-ease';
  if (horizontal) {
    const tone = here ? 'border-ink font-medium text-ink' : 'border-transparent text-muted hover:text-ink';
    return `${base} gap-1.5 whitespace-nowrap border-b-2 px-2 py-2 text-sm ${tone}`;
  }
  const tone = here ? 'bg-select font-semibold text-ink' : 'text-muted hover:bg-select/50 hover:text-ink';
  const shape = 'justify-between gap-3 rounded-lg px-3 py-1.5 text-sm';
  return `${base} ${shape} ${tone}`;
}
