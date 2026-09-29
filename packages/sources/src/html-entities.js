// Entities left in a body once its tags are gone. Every one used to become a
// space, which split words: an apostrophe arrives as &#39; and "PhonePe's"
// was stored as "PhonePe s", 180 times in the leaked Greenhouse rows alone.

// Punctuation that belongs inside a word or a sentence is decoded. Anything
// else still becomes a space, as before.
const NAMED = {
  nbsp: ' ', quot: '"', apos: "'", lsquo: "'", rsquo: "'", ldquo: '"', rdquo: '"', hellip: '...',
}

// "<" and ">" are never decoded back, from a number or a name: core's
// normalizeJdText drops everything between a "<" and the next ">" as a tag,
// so a literal "salary < 10 LPA ... > 5 years" would lose the words between.
const LT = 60
const GT = 62

function fromCode(code) {
  if (!Number.isFinite(code) || code < 32 || code === LT || code === GT || code > 0x10ffff) return ' '
  return String.fromCodePoint(code)
}

export function decodeEntities(text) {
  return text
    // Greenhouse escapes a body that was already HTML, so an ampersand in
    // the text arrives as &amp;amp; and "L&D" was stored as "L D".
    .replace(/&amp;(?:amp;)*/g, '&')
    .replace(/&#(\d+);|&#x([0-9a-f]+);/gi, (_, dec, hex) => fromCode(dec ? Number(dec) : parseInt(hex, 16)))
    .replace(/&([a-z]+);/gi, (_, name) => NAMED[name.toLowerCase()] ?? ' ')
}
