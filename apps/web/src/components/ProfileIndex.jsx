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
                {row.count != null && <span className="tnum text-xs">{row.count}</span>}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// The marker is a 2px ink rule on the reading edge (left in the column,
// under the word in the strip) plus weight: size and weight first, colour
// last, and no colour at all here beyond ink and muted. In the column the
// rule hangs in the page gutter so the labels sit flush with the name
// above them, on the same left edge as the topbar's wordmark.
function linkClass(horizontal, here) {
  const base = 'flex items-baseline transition-colors duration-fast ease-ease';
  const tone = here ? 'border-ink font-medium text-ink' : 'border-transparent text-muted hover:text-ink';
  const shape = horizontal
    ? 'gap-1.5 whitespace-nowrap border-b-2 px-2 py-2 text-sm'
    : '-ml-3.5 justify-between gap-3 border-l-2 py-1 pl-3 text-sm';
  return `${base} ${shape} ${tone}`;
}
