import { jdSentences } from './jd-sentences.js'

// Strips the sentences a body shares with other postings, so a fingerprint
// (fingerprint.js) is taken over what an ad says about THIS role and not
// over what the company says about itself in every ad.
//
// Why it exists: over the 2238 fingerprintable bodies in the corpus, two
// different Canonical roles, "Manager of Enterprise Open Source Sales Team"
// and "Telecom Account Executive", scored 0.953 on the raw body. Each is 31
// sentences, of which 26 are the same about-us, benefits and EEO block. With
// that block gone the pair falls below 0.84, compared on the 4 and 5 role
// sentences that share nothing. Corpus-wide, pairs at 0.92 fell from 308 to
// 135, and pairs across two different companies from 3 to 0.
//
// The rule is one count: a sentence found in three or more postings, from
// any company, is template. A two-rule version (three postings of one
// company, or three different companies) measured the same 135 pairs, and
// the single count stays symmetric when an aggregator spells the company
// differently from the employer, which a per-company count does not. Two is
// too low: it erases every body a company posted twice, leaving 388 rows
// under MIN_TEXT and not one pair at 1.000. A fraction of the company's
// postings fails the other way: Canonical has 80 ads with several about-us
// variants, so no sentence reaches half of them and the 0.953 stands.
//
// KNOWN LIMIT: a job the same company posts three times (Bosch listed "SDS
// S/4 HANA ABAP Developer" for five separate months) is indistinguishable
// from template and is erased whole, 0 of 13 sentences kept. The fingerprint
// then finds nothing, which is the safe failure but not a useful one.
export const BOILERPLATE_MIN_POSTINGS = 3

export function boilerplateIndex(postings) {
  const seenIn = new Map()
  for (const posting of postings) {
    // Once per posting, so an ad that repeats a line cannot make it template.
    for (const sentence of new Set(jdSentences(posting.descriptionText))) {
      seenIn.set(sentence, (seenIn.get(sentence) ?? 0) + 1)
    }
  }
  const isBoilerplate = (sentence) => (seenIn.get(sentence) ?? 0) >= BOILERPLATE_MIN_POSTINGS
  return {
    isBoilerplate,
    // Order is preserved: the shingles the fingerprint reads span the joins
    // between sentences, so reordering would move the hash for no change.
    strip: (text) => jdSentences(text).filter((s) => !isBoilerplate(s)).join(' '),
  }
}
