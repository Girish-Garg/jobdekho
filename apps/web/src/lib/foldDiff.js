// A resume source is a page or two of LaTeX, and a proposal that rewrote
// three bullets should read as three bullets, not as the whole page again.
// Long runs of unchanged lines fold into one { op: 'skip', count } row,
// keeping `context` lines either side of every change so each change is
// still read in its place. A run is only folded when that saves at least
// two lines: a row saying "1 unchanged line" takes the room of the line.
export function foldUnchanged(ops, context = 2) {
  const out = [];
  let i = 0;
  while (i < ops.length) {
    if (ops[i].op !== 'same') {
      out.push(ops[i]);
      i += 1;
      continue;
    }
    let j = i;
    while (j < ops.length && ops[j].op === 'same') j += 1;
    const run = ops.slice(i, j);
    const head = i === 0 ? 0 : context;
    const tail = j === ops.length ? 0 : context;
    const hidden = run.length - head - tail;
    if (hidden >= 2) out.push(...run.slice(0, head), { op: 'skip', count: hidden }, ...run.slice(run.length - tail));
    else out.push(...run);
    i = j;
  }
  return out;
}
