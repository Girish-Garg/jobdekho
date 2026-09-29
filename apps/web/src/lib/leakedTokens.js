import { SURE, PAIRED, isTagName, breakFor } from './leakedTagNames.js';
import { markAttributes } from './leakedAttributes.js';

// Which words of a leaked body are markup (see scrubLeakedTags.js), as a map
// from word index to what it leaves behind: a line break for a block tag,
// nothing for the rest.

const CLOSER = /^\/([a-z][a-z0-9]*)$/;

// A closer takes the nearest opener that reads as a tag (already marked by
// its attributes, or sitting against other markup), else the nearest at all.
// A bare "a" is too common a word for that fallback: a link opener always
// carried an href, so only one already marked by it is ever taken.
function pairOpeners(tokens, out) {
  const open = new Map();
  tokens.forEach((token, i) => {
    if (PAIRED.has(token)) open.set(token, [...(open.get(token) || []), i]);
    const closer = CLOSER.exec(token);
    const stack = closer && open.get(closer[1]);
    if (!stack?.length) return;
    const isLink = closer[1] === 'a';
    const tagLike = (at) => out.has(at) || (!isLink && (at === 0 || out.has(at - 1) || out.has(at + 1)));
    const pick = [...stack].reverse().find(tagLike) ?? (isLink ? undefined : stack.at(-1));
    if (pick === undefined) return;
    stack.splice(stack.indexOf(pick), 1);
    out.set(pick, breakFor(closer[1], false));
  });
}

// A snippet cut at 280 characters loses the closer, so "li strong Parental
// Support" has nothing to pair with. Prose opening a paragraph or a list item
// writes "Strong" with a capital, so a lowercase one right after a block tag
// is the tag.
const OPENS_BLOCK = new Set(['strong', 'span']);

function markBlockOpeners(tokens, out) {
  tokens.forEach((token, i) => {
    if (!OPENS_BLOCK.has(token) || out.has(i)) return;
    // Back over inline markup ("p span strong") to the block tag before it.
    let j = i - 1;
    while (j >= 0 && out.get(j) === '') j -= 1;
    if (out.get(j)?.includes('\n')) out.set(i, '');
  });
}

export function markupTokens(tokens) {
  const out = new Map();
  markAttributes(tokens, out);
  tokens.forEach((token, i) => {
    const closer = CLOSER.exec(token);
    if (closer && isTagName(closer[1])) out.set(i, breakFor(closer[1], true));
    else if (SURE.has(token) && !out.has(i)) out.set(i, breakFor(token, false));
  });
  pairOpeners(tokens, out);
  markBlockOpeners(tokens, out);
  return out;
}
