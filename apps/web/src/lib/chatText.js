// A model answer is plain text with a little markdown habit in it: blank
// lines between paragraphs, dashes for lists, **bold** for the one phrase
// that matters. This turns that into blocks the panel renders as React text
// nodes, so nothing the model wrote is ever parsed as HTML. Anything else
// markdown can do is left as the characters it is, which still reads fine.
//
//   { type: 'p', lines: [spans, ...] }       one paragraph, its line breaks kept
//   { type: 'ul', items: [spans, ...] }
//   { type: 'ol', start, items: [spans, ...] }
//
// where spans is [{ text, bold }].
const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*(\d{1,3})[.)]\s+(.*)$/;
const BOLD = /\*\*(.+?)\*\*/g;

export function inlineSpans(text) {
  const spans = [];
  let last = 0;
  for (const match of text.matchAll(BOLD)) {
    if (match.index > last) spans.push({ text: text.slice(last, match.index), bold: false });
    spans.push({ text: match[1], bold: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) spans.push({ text: text.slice(last), bold: false });
  return spans;
}

function listItem(line) {
  const bullet = line.match(BULLET);
  if (bullet) return { type: 'ul', text: bullet[1] };
  const numbered = line.match(NUMBERED);
  if (numbered) return { type: 'ol', text: numbered[2], start: Number(numbered[1]) };
  return null;
}

// An indented line under a list item is that item wrapping, as a model
// writes a long point; an unindented one is the prose after the list.
function joinLine(blocks, open, raw) {
  const item = listItem(raw);
  if (item) {
    if (open?.type === item.type) {
      open.items.push(item.text);
      return open;
    }
    const list = item.type === 'ol' ? { type: 'ol', start: item.start, items: [item.text] } : { type: 'ul', items: [item.text] };
    blocks.push(list);
    return list;
  }
  if (open && open.type !== 'p' && /^\s/.test(raw)) {
    open.items[open.items.length - 1] += ` ${raw.trim()}`;
    return open;
  }
  if (open?.type === 'p') {
    open.lines.push(raw.trim());
    return open;
  }
  const paragraph = { type: 'p', lines: [raw.trim()] };
  blocks.push(paragraph);
  return paragraph;
}

// A posting's id is how the chat names a job to the server, never something
// to read; the server takes ids out of new answers (see its chat/
// reply-ids.js), and this takes them out of answers saved before it did,
// and out of one still being written, which the server has not cleaned yet:
// "id 7218f734fa01cd5a, Full Stack Developer" with its dash or colon, or
// "(id 7218f734fa01cd5a)" with its brackets. Only an "id" then sixteen hex
// characters, so no other text is touched.
const OLD_ID = /\s?\(\s*id\s*[:#]?\s*[0-9a-f]{16}\s*\)|\bid\s*[:#]?\s*[0-9a-f]{16}\b\s*(?:[\u2013\u2014:-]\s*)?/gi;

export function chatBlocks(text) {
  const blocks = [];
  let open = null;
  for (const raw of String(text ?? '').replace(OLD_ID, '').replace(/\r\n?/g, '\n').split('\n')) {
    open = raw.trim() ? joinLine(blocks, open, raw.trimEnd()) : null;
  }
  return blocks.map((block) => (block.type === 'p'
    ? { type: 'p', lines: block.lines.map(inlineSpans) }
    : { ...block, items: block.items.map(inlineSpans) }));
}
