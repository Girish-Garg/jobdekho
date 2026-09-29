// Rows scraped before the structure-keeping stripHtml were stored as one flat
// line, with the entities a board escaped twice left in as text: "automated
// &#xa0;test", "L&amp;D". A scrape rewrites any job still listed; closed
// ones it never reaches again, so they are read back here, as they are shown.
// The stored text stays as it was scraped.
const NAMED = { amp: '&', quot: '"', apos: "'", nbsp: '\u00a0', rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201d', ldquo: '\u201c', hellip: '\u2026' };
const ENTITY = /&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi;

// "<" and ">" stay escaped, as the scraper leaves them: decoding them could
// turn a leaked tag back into something that looks like markup.
function decodeOne(match, body) {
  if (body[0] !== '#') return NAMED[body.toLowerCase()] ?? match;
  const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : Number(body.slice(1));
  if (code === 60 || code === 62 || code < 32 || code > 0x10ffff) return match;
  return String.fromCodePoint(code);
}

// Twice, because "&amp;#xa0;" is one escape inside another.
export const decodeEntities = (text) => String(text || '').replace(ENTITY, decodeOne).replace(ENTITY, decodeOne);

// Short enough to have been one list item; longer reads as a paragraph. The
// opening is always a paragraph: a job starts with prose, not a bullet, and
// a short label ("WHAT YOU'LL DO:") stands alone so it reads as a heading.
const ITEM_MAX = 220;
const isLabel = (part) => part.length <= 60 && (part.endsWith(':') || !/[a-z]/.test(part));
const asLine = (part, i) => (i > 0 && part.length <= ITEM_MAX && !isLabel(part) ? `- ${part}` : `\n${part}\n`);

// In these flat rows a list item or paragraph that ended in a non-breaking
// space shows as that space followed by an ordinary one, where the tag used
// to be ("grow.&#xa0; As a Test..."), while a non-breaking space inside a
// sentence has no space after it ("automated&#xa0;test"). Measured on the
// SmartRecruiters rows of the demo corpus. Text that already has line breaks
// was scraped with its structure and is left alone.
export function legacyText(raw) {
  const text = decodeEntities(raw);
  if (text.includes('\n') || !text.includes('\u00a0')) return text.replace(/\u00a0/g, ' ');
  const parts = text.split(/\u00a0+\s+/).map((part) => part.replace(/\u00a0/g, ' ').trim()).filter(Boolean);
  if (parts.length < 2) return parts.join('');
  return parts.map(asLine).join('\n');
}
