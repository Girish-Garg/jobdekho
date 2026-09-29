// The tag names a leaked body can carry as words (see scrubLeakedTags.js),
// and what each leaves behind once it is recognised as markup.

const BLOCK = new Set(['p', 'div', 'ul', 'ol', 'section', 'article', 'table', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const LINE = new Set(['br', 'hr', 'tr']);

// No sentence uses these as a bare lowercase word, so inside a leaked body
// every one of them is a tag.
export const SURE = new Set([
  'p', 'div', 'ul', 'ol', 'li', 'br', 'hr', 'tr', 'td', 'th', 'tbody', 'thead', 'blockquote',
  'em', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
]);

// These are English as well: "strong skills", "span teams", "a team", "open
// source". One goes only on evidence: attributes after it, or its own closer.
export const PAIRED = new Set([
  'strong', 'span', 'a', 'section', 'article', 'table', 'video', 'source', 'font', 'small', 'code', 'center', 'sup', 'sub',
]);

export const isTagName = (word) => SURE.has(word) || PAIRED.has(word);

// The same breaks stripHtml now writes at ingest (sources/html-layout.js).
export function breakFor(name, closing) {
  if (name === 'li') return closing ? '' : '\n- ';
  if (BLOCK.has(name)) return '\n\n';
  return LINE.has(name) ? '\n' : '';
}
