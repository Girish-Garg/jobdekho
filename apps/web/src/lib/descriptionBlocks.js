// A stored description is plain text whose line breaks are its structure
// (see packages/sources/src/html.js): a blank line between blocks, one line
// per list item. This reads it back into what the pane draws: headings,
// paragraphs and lists.

// "- " is what stripHtml writes; the rest are what boards type themselves.
const BULLET = /^(?:[-*•●▪·]|(\d{1,2})[.)])\s+/;
const SENTENCE_END = /[.,;!]$/;
const words = (line) => line.split(/\s+/).length;
const blank = (line) => line === undefined || line.trim() === '';

// There is no heading tag left to go by, so a heading is a line that reads
// as one: short, not a sentence, and either labelled with a colon, set in
// capitals, or standing on its own between blank lines like a title.
function isHeading(line, before, after) {
  if (line.length > 70 || words(line) > 8 || SENTENCE_END.test(line) || /https?:\/\//.test(line)) return false;
  if (line.endsWith(':')) return true;
  if (/[A-Z]{3}/.test(line) && !/[a-z]/.test(line)) return true;
  const alone = blank(before) && (blank(after) || BULLET.test(after));
  return alone && /^[A-Z0-9]/.test(line) && !line.includes(',') && words(line) <= 7;
}

// "Transparency: Everyone can read..." reads better with its label set apart.
function withLead(text) {
  const m = /^([A-Z][^:.!?/]{0,38}):\s+(\S.*)$/.exec(text);
  return m && words(m[1]) <= 5 ? { lead: `${m[1]}:`, text: m[2] } : { lead: '', text };
}

function listItem(line) {
  const m = BULLET.exec(line);
  return { number: m[1] ? Number(m[1]) : null, ...withLead(line.slice(m[0].length)) };
}

export function descriptionBlocks(text) {
  const lines = String(text || '').split('\n').map((line) => line.trim());
  const blocks = [];
  let list = null;
  lines.forEach((line, i) => {
    if (!line) return;
    const heading = isHeading(line.replace(BULLET, ''), lines[i - 1], lines[i + 1]);
    if (BULLET.test(line) && !(heading && /^\d/.test(line))) {
      if (!list) blocks.push((list = { kind: 'list', items: [] }));
      list.items.push(listItem(line));
      return;
    }
    // A wrapped bullet: a plain line straight under an item continues it.
    if (list && !blank(lines[i - 1]) && !heading) {
      list.items.at(-1).text += ` ${line}`;
      return;
    }
    list = null;
    blocks.push(heading ? { kind: 'heading', text: line.replace(/:$/, '') } : { kind: 'paragraph', ...withLead(line) });
  });
  // Ordered only when the numbers count up one by one, since an <ol> will
  // renumber whatever it is given.
  const counts = (items) => items.every((item, k) => item.number !== null && item.number === items[0].number + k);
  return blocks.map((block) => (block.kind === 'list' ? { ...block, ordered: counts(block.items) } : block));
}
