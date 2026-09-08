// Most ATS APIs return the job body as HTML. The level and degree classifiers
// read plain text, so tags and entities have to go before the body is stored.

// Some boards escape their HTML before sending it, so a body arrives as
// "&lt;p&gt;Job Title&lt;/p&gt;" rather than "<p>Job Title</p>". Greenhouse
// does this on every posting, and Ashby, Lever, Workable and Internshala on
// some. Stripping real tags first finds nothing, and the entity pass then
// turns only the angle brackets into spaces, leaving the tag names behind as
// words: 61% of the stored corpus read "p div h2 strong br class style"
// interleaved with its own prose, and 6% of every word stored was markup.
//
// That is not merely untidy. Those words go into the 4000 characters the
// scorer reads, into the word count ghost.js uses to decide a description is
// too thin to be real, and into content fingerprints, where the shared
// scaffolding of one provider's template made two unrelated postings at two
// different companies look like the same job.
//
// Escaped tags are removed whole rather than decoded back into "<", because
// decoding would turn a literal "salary &lt; 10 LPA" into an opening bracket
// and the next pass would eat everything up to the following ">". The
// non-greedy body and the exclusion of & < > keep one match to one tag.
const ESCAPED_TAG = /&lt;\/?[a-z][^&<>]*?&gt;/gi

export function stripHtml(s) {
  return String(s || '')
    .replace(ESCAPED_TAG, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;|&#\d+;/g, ' ')
}
