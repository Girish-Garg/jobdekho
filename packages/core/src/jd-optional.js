// Whether a line's own words make all of it a nice-to-have, wherever it
// sits: "Bonus points if you know Svelte" under Supabase's "You are:", or
// "Kafka is a plus" under "Requirements". The cue has to govern the whole
// line, by opening it ("Preferred:", "Nice to have:") or by closing it as
// what the line says of itself ("... is a plus", "... preferred"). A cue
// that qualifies only part of a line leaves it where its heading put it:
// "Bachelor's degree required (Master's preferred)" and "3 years of Java,
// preferably Spring" are must-haves, and the old rule, a cue anywhere in
// the line, moved 7 of 40 such lines checked on the owner's postings.

// Words that mark something wished for rather than asked. "Preferably"
// leans on the words after it, so it only ever opens a line. "Is an
// advantage", "desired" and "is beneficial" close as many lines on the
// owner's postings (81, 28 and 29 under requirement or duty headings),
// which the section model would otherwise show as requirements.
const CUE = String.raw`nice[-\u2011 ]to[-\u2011 ]haves?|good[-\u2011 ]to[-\u2011 ]haves?|an? (?:big |huge |great |definite |real |nice |added |additional |distinct |strong )?(?:plus|bonus|advantage)|added advantages?|would be (?:an? )?(?:plus|great|nice|good|advantage)|(?:highly |strongly |very |much )?(?:preferred|desirable|advantageous)|(?<!\b(?:as|the|if) )(?:highly |strongly )?desired|(?:is|are|be) (?:highly |very |extremely |also )?(?:beneficial|helpful)|optional|not required`
const NOT_NEEDED = String.raw`not (?:required|mandatory|necessary|essential|a must|a requirement)`

const LEAD = /^(?:preferred|preferably|desirable|optional(?:ly)?|bonus|plus(?=\s*:|\s+points?)|nice[-\u2011 ]to[-\u2011 ]haves?|good[-\u2011 ]to[-\u2011 ]haves?|(?:an? )?added advantage|advantageous|not required|(?:it(?:['’]s| is| would be| will be)|would be|will be) (?:an? (?:big |huge |great |definite |added )?(?:plus|bonus|advantage)|great|nice))\b/i
const TRAIL = new RegExp(`(?:${CUE})(?:,?\\s+(?:but\\s+|and\\s+|though\\s+)?(?:(?:is|are)\\s+)?${NOT_NEEDED})?[\\s.!:)\\]]*$`, 'i')
// "(preferred)" on its own at the end of a line.
const BARE = new RegExp(`\\(\\s*(?:${CUE})\\s*\\)[\\s.!]*$`, 'i')
// An aside closing the line with words of its own ("(Master's preferred)")
// speaks for those words only.
const ASIDE = /\([^()]*\)[\s.!]*$/
const NEGATED = /\bnot\s+(?:just\s+|only\s+|merely\s+)?$/i

// What, before the cue, shows the line asks for something of its own: a
// second clause, a must-have word, a sentence run into it without a stop,
// or a list whose last item is a new ask.
const ABBREV = /\b(?:etc|e\.g|i\.e|vs|incl|approx|inc|ltd|sr|jr|no)\./gi
const BOUNDARY = /[;(]|\s[-\u2013\u2014]\s|,\s*(?:so|but|while|whereas|although|though|however|with|plus)\b|\b(?:combined|along|together|coupled) with\b|\bin addition to\b/i
// A stop before a capital starts a second sentence; "lab. testing" does not.
const SENTENCE = /[.!?]\s+[A-Z(]/
const MUST = /\b(?:required|requires?|requirements?|mandatory|must|essential|necessary|has to|have to)\b/i
const RUN_ON = /[a-z0-9)]\s*(?:Experience|Knowledge|Familiarity|Exposure|Understanding|Proficiency|Hands-on|Strong|Good|Working|Ability|Prior|Previous)\b/
const OPENER = /^(?:(?:and|or|and\/or|&)\s+)?(?:experience|knowledge|familiarity|exposure|understanding|proficiency|proficient|prior|previous|past|hands[- ]on|strong|good|working|basic|solid|ability|certifications?|certified|\d)/i
const YEARS = /\d\s*\+?\s*(?:(?:to|-|\u2013)\s*\d+\s*\+?\s*)?(?:years?|yrs?)\b/i
const DEGREE = /\b(?:bachelor|master|degree|b\.?\s?tech|b\.?\s?e\b|m\.?\s?tech|mba|mca|bca|ph\.?\s?d|graduate|post[- ]?graduate|diploma)/i

// Whether a closing cue speaks for everything before it. A comma list is
// one ask ("Experience with Kafka, RabbitMQ or Pulsar is a plus") unless
// its last item opens a new one ("..., Prior experience with X preferred")
// or an earlier one asks for years, or a degree sits on both sides of it
// ("Bachelor's degree, Master's preferred").
function governs(head) {
  const flat = head.replace(/\([^()]*\)/g, ' ').replace(ABBREV, ' ')
  if (BOUNDARY.test(flat) || SENTENCE.test(flat) || MUST.test(flat) || RUN_ON.test(flat)) return false
  const at = flat.lastIndexOf(',')
  if (at < 0) return true
  const earlier = flat.slice(0, at)
  const last = flat.slice(at + 1).trim()
  if (OPENER.test(last) || YEARS.test(earlier)) return false
  return !(DEGREE.test(earlier) && DEGREE.test(last))
}

export function optionalLine(line) {
  let text = String(line || '').replace(/^[^A-Za-z(]+/, '').trim()
  // A line that is one aside, "(SAFe is a plus)", is read inside it.
  if (/^\([^()]*\)[\s.]*$/.test(text)) text = text.replace(/^\(|\)[\s.]*$/g, '').trim()
  if (LEAD.test(text)) return true
  const bare = BARE.exec(text)
  if (bare) {
    const head = text.slice(0, bare.index)
    return governs(head) && !/,/.test(head.replace(/\([^()]*\)/g, ' '))
  }
  if (ASIDE.test(text)) return false
  const m = TRAIL.exec(text)
  if (!m || NEGATED.test(text.slice(0, m.index))) return false
  return governs(text.slice(0, m.index))
}
