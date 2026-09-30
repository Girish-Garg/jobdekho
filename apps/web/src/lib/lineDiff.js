// What a document proposal would change, line by line, for the card's "View
// changes". The server stores every proposal as the whole new source, built
// from the model's targeted edits or written whole (see its chat/
// document-proposal.js), so the card works out the difference itself.
//
// The common start and end are matched first: a typical proposal touches a
// few lines of a page, which leaves a small middle for the longest common
// subsequence. A middle too large for that table is shown as removed then
// added, which is still true, only less precise.
const MAX_CELLS = 2_000_000;

export function splitLines(text) {
  if (!text) return [];
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

const same = (text) => ({ op: 'same', text });
const del = (text) => ({ op: 'del', text });
const add = (text) => ({ op: 'add', text });

// A removed line is listed before the line that replaced it, the order a
// person reads an edit in: what was there, then what is there now.
function lcsOps(a, b) {
  const table = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push(same(a[i]));
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      ops.push(del(a[i]));
      i += 1;
    } else {
      ops.push(add(b[j]));
      j += 1;
    }
  }
  return [...ops, ...a.slice(i).map(del), ...b.slice(j).map(add)];
}

// [{ op: 'same' | 'del' | 'add', text }], in reading order.
export function diffLines(before, after) {
  const a = splitLines(before);
  const b = splitLines(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const middle = midA.length * midB.length > MAX_CELLS ? [...midA.map(del), ...midB.map(add)] : lcsOps(midA, midB);
  return [...a.slice(0, start).map(same), ...middle, ...a.slice(endA).map(same)];
}

export function changeCount(ops) {
  return {
    added: ops.filter((line) => line.op === 'add').length,
    removed: ops.filter((line) => line.op === 'del').length,
  };
}
