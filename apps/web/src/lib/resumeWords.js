// Mirrors companyKey in packages/core/src/company-key.js, since the web
// bundle cannot import core: the employer written "Acme Labs Pvt. Ltd." on
// the profile and "ACME LABS" on the resume meets on one key. resumeWords
// .test.js holds the two copies to the same answers.
const LEGAL_TAIL = new Set([
  'limited', 'ltd', 'pvt', 'private', 'inc', 'llc', 'llp', 'corp', 'corporation', 'co', 'company',
  'india', 'technologies', 'technology', 'solutions', 'services', 'software', 'group',
]);
const RUN_TOGETHER_TAIL = [
  'limited', 'private', 'software', 'technologies', 'technology', 'solutions', 'services', 'corporation', 'india', 'group',
];
const MIN_STEM = 3;

export const words = (text) => String(text ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean);

function peel(word) {
  const tail = RUN_TOGETHER_TAIL.find((end) => word.endsWith(end) && word.length - end.length >= MIN_STEM);
  return tail ? peel(word.slice(0, -tail.length)) : word;
}

export function orgKey(name) {
  const tokens = words(name);
  while (tokens.length > 1 && LEGAL_TAIL.has(tokens.at(-1))) tokens.pop();
  if (tokens.length) tokens.push(peel(tokens.pop()));
  return tokens.join(' ');
}

// The little words a title can lose without changing what it names, and the
// short forms resumes use for the long ones, degrees included, so "B.Tech in
// CS" and "Bachelor of Technology" are not two programmes on spelling alone.
const STOP = new Set(['a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'the', 'to', 'with']);
const SPELLED = {
  sr: 'senior', jr: 'junior', sde: 'software development engineer', swe: 'software engineer',
  eng: 'engineer', engg: 'engineer', mgr: 'manager', dev: 'developer', internship: 'intern',
  btech: 'bachelor technology', be: 'bachelor engineering', bsc: 'bachelor science', bs: 'bachelor science',
  ba: 'bachelor arts', bca: 'bachelor computer applications', bcom: 'bachelor commerce',
  mtech: 'master technology', msc: 'master science', ms: 'master science', ma: 'master arts',
  mca: 'master computer applications', mba: 'master business administration', phd: 'doctor philosophy',
};

// A plural and an -ing come off, the same on both sides, so "Engineering
// Intern" and "Engineer Intern", or "Systems" and "System", read alike.
function stem(word) {
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

// Own keys only: a title is the person's or the resume's text, and the word
// "constructor" found the Object function and failed every fill.
const spelled = (word) => (Object.hasOwn(SPELLED, word) ? SPELLED[word] : word);

// A title as the words that say what it is. The dots inside a short form
// go first ("B.Tech", "Ph.D"), so it stays one word to spell out.
export function titleWords(title) {
  const plain = String(title ?? '').toLowerCase().replace(/['’]/g, '').replace(/(\p{L})\.(?=\p{L})/gu, '$1');
  return words(plain).flatMap((word) => spelled(word).split(' ')).filter((word) => !STOP.has(word)).map(stem);
}

// How alike two titles read: 1 for the same words in any order, 0.8 for
// one inside the other with a word to spare ("Software Engineer" and
// "Software Engineer II"), else the share of words they have in common.
export function titleScore(a, b) {
  const x = new Set(titleWords(a));
  const y = new Set(titleWords(b));
  if (!x.size || !y.size) return 0;
  const shared = [...x].filter((word) => y.has(word)).length;
  if (shared === x.size && shared === y.size) return 1;
  const small = Math.min(x.size, y.size);
  if (shared === small && small >= 2 && Math.max(x.size, y.size) - small === 1) return 0.8;
  return (2 * shared) / (x.size + y.size);
}
