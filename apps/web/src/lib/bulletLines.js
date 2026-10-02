// The edits the "What you did" editor makes to an entry's bullet lines, kept
// pure so each one reads, and is tested, on its own. Each that moves the
// cursor returns the next lines with the line and caret to focus after.

// A bullet pasted from a resume keeps its marker (a bullet glyph, a dash of
// any length, a star or "1."), and the editor draws its own line for it.
// The two long dashes go in by code point, so this file holds none itself.
const LONG_DASHES = String.fromCharCode(0x2013, 0x2014);
const MARKER = new RegExp(`^\\s*(?:[-*•‣▪◦·${LONG_DASHES}]|\\d+[.)])\\s+`);

export function splitLines(text) {
  return String(text ?? '').split(/\r\n|\r|\n/).map((line) => line.replace(MARKER, '').trim()).filter(Boolean);
}

// Enter: the line splits at the caret, what was after it starting the new
// line under it, the way a list in any editor does.
export function breakLine(lines, index, start, end) {
  const line = lines[index];
  const next = [...lines.slice(0, index), line.slice(0, start), line.slice(end), ...lines.slice(index + 1)];
  return { lines: next, focus: { index: index + 1, caret: 0 } };
}

// Backspace in an empty line: it goes, and the caret ends the line above.
export function dropLine(lines, index) {
  return { lines: lines.filter((_, i) => i !== index), focus: { index: index - 1, caret: lines[index - 1].length } };
}

// The line at `from` taken out and put back at `to`; null when that is no
// move at all, past either end of the list.
export function moveLine(lines, from, to) {
  if (from === to || to < 0 || to >= lines.length) return null;
  const next = [...lines];
  const [line] = next.splice(from, 1);
  next.splice(to, 0, line);
  return next;
}

// Several lines pasted into one: the first joins the text before the caret,
// the last the text after it, and each between is a line of its own. Null
// for a single line, which the input pastes as usual.
export function pasteLines(lines, index, start, end, text) {
  const pieces = splitLines(text);
  if (pieces.length < 2) return null;
  const line = lines[index];
  const after = line.slice(end);
  const last = pieces.length - 1;
  const added = pieces.map((piece, i) => `${i === 0 ? line.slice(0, start) : ''}${piece}${i === last ? after : ''}`);
  return {
    lines: [...lines.slice(0, index), ...added, ...lines.slice(index + 1)],
    focus: { index: index + last, caret: added[last].length - after.length },
  };
}
