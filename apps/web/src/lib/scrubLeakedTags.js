import { markupTokens } from './leakedTokens.js';
import { layoutLines } from './textLayout.js';

// 147 stored Greenhouse bodies (and more snippets) still read like
// "div class= content-intro p strong About PhonePe Limited: /strong /p p
// Headquartered in India". Greenhouse escapes its HTML, and until the fix of
// 2026-09-11 the scraper removed only the angle brackets. Those jobs have
// since closed, so no scrape will ever reach them again. They are cleaned
// here, as they are shown, rather than by rewriting the stored corpus: this
// only changes what a person reads, and the stored text stays evidence of
// what was scraped.
//
// Deterministic and narrow. A body is touched only when it carries markup no
// sentence contains: a closing tag standing as its own word ("/p", "/strong")
// or an attribute ("class=", "style=", "href="). A clean body comes back as
// it went in, so "p99 latency" or "strong communication skills" are never at
// risk. Inside a leaked body the block tags become the line breaks stripHtml
// now writes at ingest, so these old rows get paragraphs and lists too.
const SIGNATURE = /(?:^|\s)(?:\/(?:p|li|ul|ol|div|span|strong|em|h[1-6])|(?:class|style|href)=)(?=\s|$)/;

export function hasLeakedTags(text) {
  return SIGNATURE.test(String(text || ''));
}

export function scrubLeakedTags(text) {
  const value = String(text || '');
  if (!hasLeakedTags(value)) return value;
  const tokens = value.split(/\s+/).filter(Boolean);
  // The stored body was cut at a character count, sometimes inside a closer.
  if (/^\/[a-z]{0,9}$/.test(tokens.at(-1))) tokens.pop();
  const markup = markupTokens(tokens);
  const rebuilt = tokens.map((token, i) => (markup.has(i) ? ` ${markup.get(i)} ` : token)).join(' ');
  return layoutLines(rebuilt);
}
