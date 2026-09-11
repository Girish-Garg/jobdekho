// Most ATS APIs return the job body as HTML. The level and degree classifiers
// read plain text, so tags and entities have to go before the body is stored.

// Some boards escape their HTML before sending it, so a body arrives as
// "&lt;p&gt;Job Title&lt;/p&gt;" rather than "<p>Job Title</p>". Greenhouse
// does this on every posting, and Ashby, Lever, Workable and Internshala on
// some. Stripping real tags first finds nothing, and the entity pass then
// turns only the angle brackets into spaces, leaving the tag names behind as
// words: 47% of stored bodies read "/p div class= style=" interleaved with
// their own prose. Counting bare "strong" or "table" put it higher, but those
// are also ordinary English, so the figure counts only what prose never says.
//
// That is not merely untidy. Those words go into the 4000 characters the
// scorer reads, into the word count ghost.js uses to decide a description is
// too thin to be real, and into content fingerprints, where the shared
// scaffolding of one provider's template made two unrelated postings at two
// different companies look like the same job.
//
// Escaped tags are removed whole rather than decoded back into "<", because
// decoding would turn a literal "salary &lt; 10 LPA" into an opening bracket
// and the next pass would eat everything up to the following ">".
//
// An escaped tag's attributes arrive escaped too: Greenhouse sends
// &lt;div class=&quot;content-intro&quot;&gt;. The first version of this
// pattern refused any & inside a tag, so every tag carrying an attribute
// failed to match and was shredded by the entity pass instead, leaving
// "div class= content-intro" in bodies that had just been re-scraped. The
// test that shipped with it used a literal quote, so it passed while the
// real data did not. Escaped quotes and ampersands may now sit inside a tag;
// a bare &lt; or &gt; still ends it, which is what keeps one match to one tag.
const ESCAPED_TAG = /&lt;\/?[a-z](?:[^&<>]|&(?:quot|#39|#x27|apos|amp|nbsp);)*?&gt;/gi

export function stripHtml(s) {
  return String(s || '')
    .replace(ESCAPED_TAG, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;|&#\d+;/g, ' ')
}
