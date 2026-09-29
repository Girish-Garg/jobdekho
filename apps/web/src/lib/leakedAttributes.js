import { isTagName, breakFor } from './leakedTagNames.js';

// Attributes in a leaked body: "span style= font-weight: 400; Stripe is",
// "a href= https://x.com", "div class= content-intro". Each is markup along
// with its value and the element name in front of it.

const BOOLEAN_ATTR = new Set(['controls', 'autoplay', 'muted', 'loop']);
export const ATTR = /^([a-z][a-z-]*)=$/;

// Where a value ends. Its closing quote became a space in the leak, so the
// value's own shape has to say.
function valueEnd(tokens, k, name) {
  if (k >= tokens.length || ATTR.test(tokens[k])) return k;
  if (name === 'style') {
    // CSS declarations: "font-family: arial, sans-serif;", each ending in ";".
    while (/^[a-z-]+:/.test(tokens[k] || '')) {
      const stop = tokens.slice(k, k + 8).findIndex((t) => t.endsWith(';'));
      if (stop === -1) break;
      k += stop + 1;
    }
    return k;
  }
  if (name === 'class') {
    // One class, then any machine-made ones after it ("___1q1shib f2hkw1w").
    k += 1;
    while (/^[\w-]*[_\d][\w-]*$/.test(tokens[k] || '')) k += 1;
    return k;
  }
  if (tokens[k].startsWith('{')) {
    while (k < tokens.length && !tokens[k].includes('}')) k += 1;
    return k + 1;
  }
  return k + 1;
}

export function markAttributes(tokens, out) {
  tokens.forEach((token, i) => {
    const attr = ATTR.exec(token);
    if (!attr || out.has(i)) return;
    const end = valueEnd(tokens, i + 1, attr[1]);
    for (let k = i; k < end; k += 1) out.set(k, '');
    // Back over the rest of this tag: earlier attributes, bare boolean ones,
    // then the element name itself.
    let j = i - 1;
    while (j >= 0 && out.has(j)) j -= 1;
    while (j >= 0 && BOOLEAN_ATTR.has(tokens[j])) out.set(j--, '');
    if (j >= 0 && isTagName(tokens[j])) out.set(j, breakFor(tokens[j], false));
  });
}
