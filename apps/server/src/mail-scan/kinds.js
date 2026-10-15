import { senderOf, isNoReply } from './senders.js'

// What a job mail says happened, by its words: the first reader a scan has
// (the person's corrections and their AI follow, see the spec). Precision
// first, as with posting tags: a kind is 'sure' only with a cue addressed to
// the person and clear job context; anything less is 'unsure', and marketing
// is nothing at all. The first scan of a real mailbox showed why: course
// sites, prep newsletters and community digests say "interview" and "offer"
// in every subject ("Crack interviews, land offers").
//
// The order decides a mail that says two things; an offer or a rejection in
// the body outranks the subject ("Your interview at Globex", then
// "unfortunately we will not move forward").
const ORDER = ['offer', 'rejected', 'interview', 'assessment', 'applied']

const OFFER = /offer letter|offer of employment|pleased to (extend|offer) you|(happy|delighted|excited|thrilled) to (extend|offer) you|extend(ing)? (you )?an offer|your offer (letter|details|of employment)/
// "Unfortunately" alone is not a rejection ("unfortunately we must
// reschedule"); these say the person is out.
const REJECTED = /regret to inform|not (to )?(move|moving|proceed|proceeding|progress|progressing) (forward |further )?with your (application|candidature|candidacy)|(move|moving|proceed|go) forward with (other|another) candidates?|other candidates (whose|who)|not been (selected|shortlisted)|(were|was) not selected|position has (now )?been filled|(won'?t|will not) be (moving|progressing|taking) (forward|your application)|decided not to (move|proceed|progress)|no longer (being )?considered/
const APPLIED = /thank(s| you) for (applying|your application)|application (has been |was |is )?(received|submitted|sent)\b|(we('| ha)ve|have) received your application|your application (to|for|at|with|has|was)|application (confirmation|acknowledg)|successfully applied|you('ve| have) applied (to|for)|thank(s| you) for (your )?interest(ed)? in (the |our |joining )?[^.]{0,60}\b(role|position|opening|job|internship)\b/

const SUBJECT = {
  offer: OFFER,
  rejected: REJECTED,
  interview: /\byour interview\b|\binterview (invitation|invite|request|scheduled|confirmation|confirmed|slot|details|with|for)\b|invitation (to|for) (an? |the )?interview|^invitation: .*\binterview\b|\binterview (round|stage)\b|schedul(e|ing) (your |an |the )?interview|\b(technical|hr|managerial|final|first|second|1st|2nd|3rd) round\b/,
  assessment: /\bassessment (link|invitation|invite|for|round)\b|\b(online|coding|technical) assessment\b|coding (test|challenge|round|assignment)|online test|take.home|aptitude test|test link|invited you to take/,
  applied: APPLIED,
}

const BODY = {
  offer: OFFER,
  rejected: REJECTED,
  interview: /invit(e|ed|ing) you (to|for) (an? |the |your )?(\w+ )?interview|schedul(e|ed|ing) (an? |the |your )(\w+ )?interview|interview (is |has been )?(scheduled|confirmed)|your interview (on|at|with|is)|interview invitation|shortlisted for (the |an? )?(\w+ )?interview/,
  assessment: /complete (the|an|your|this) (online |coding |technical )?(assessment|test|challenge|assignment)|(assessment|test) link|invited to (take|complete|attempt)|take.home (assignment|exercise|task)/,
  applied: APPLIED,
}

const JOB = /\b(jobs?|roles?|positions?|openings?|vacanc(y|ies)|intern(ship)?s?|engineers?|developers?|analysts?|candidates?|candidature|candidacy|recruit(er|ers|ing|ment)|hiring|talent|careers?|resume|cv|interviews?|sde|swe)\b/

// The words of a promotion: what a course, a prep site or a community
// writes, and a hiring system's own mail does not.
export const PROMO = /\b(crack|ace|prep|preparation|courses?|masterclass|webinar|bootcamp|cohort|workshop|register|registration|enrol|enroll|free|discount|days? left|last chance|hurry|learn|skills?|tips|guide|roadmap|cheat ?sheet|mock|practice|quiz|contest|hackathon|newsletter|digest|weekly|edition|upskill|certification|certificate|interview.ready|job.ready)\b|% off|\btop \d+|\d+ (ways|tips|questions|mistakes)|dream (job|role|company)|land (an? )?(offers?|job|your)|career (growth|boost|tips|guide)|build your/

const cueOf = (text, cues) => ORDER.find((kind) => cues[kind].test(text)) ?? null

function kindOf(subject, body) {
  if (OFFER.test(body)) return 'offer'
  if (REJECTED.test(body)) return 'rejected'
  return cueOf(subject, SUBJECT) ?? cueOf(body, BODY)
}

// { kind, sure, sender, byYou? } or null for a mail with no kind at all.
// `inThread` says the person wrote in this mail's thread, so a person
// answering in it is a reply even with no cue word.
export function readKind(mail, { inThread = false } = {}) {
  const sender = senderOf(mail.from.address)
  const subject = mail.subject.toLowerCase()
  const body = mail.text.slice(0, 1500).toLowerCase()
  const fromHiring = sender.kind === 'ats' || sender.kind === 'test'
  if (sender.kind === 'marketing' || (!fromHiring && PROMO.test(subject))) return null
  if (!(fromHiring || JOB.test(subject) || JOB.test(body.slice(0, 600)))) return null
  if (mail.mine) {
    const applying = APPLIED.test(subject) || /\b(application|applying) for\b/.test(subject)
    return applying ? { kind: 'applied', sure: true, sender, byYou: true } : null
  }
  const kind = sender.kind === 'test' && !OFFER.test(body) && !REJECTED.test(body) ? 'assessment' : kindOf(subject, body)
  if (!kind) {
    const human = !isNoReply(mail.from.address) && sender.kind !== 'board' && !mail.bulk
    return inThread && human ? { kind: 'replied', sure: true, sender } : null
  }
  // Boards, and anyone mailing a list, send their own news; from them only an
  // application they confirm is taken as sure.
  if (sender.kind === 'board' || (mail.bulk && !fromHiring)) return { kind, sure: kind === 'applied' && APPLIED.test(subject), sender }
  return { kind, sure: fromHiring || cueOf(subject, SUBJECT) === kind || JOB.test(subject), sender }
}
