// What the chat is told about memory (see packages/store/src/memory.js): how
// to suggest a line to keep, after the page's own instruction, and the lines
// kept that bear on the question (see memory/picker.js), right before the
// question itself: models follow a preference far more often when it sits
// next to what they answer (PrefEval, ICLR 2025). Nothing at all when the
// person switched memory off. Every rule here is also enforced in code
// after the reply (see memory-suggest.js); the prompt says them so a model
// gets them right, not so that anything depends on it obeying.
const RULES = `JobDekho keeps a short memory of this person's lasting preferences, and you may suggest lines for it. Your JSON object may also carry "memory": a list of at most 3 suggestions, each {"text":"...","scope":"...","quote":"...","replaces":"id"}. JobDekho shows each one under your answer and keeps it only when the person agrees, so never say in "reply" that you saved, noted or will remember anything.

Suggest one only for a lasting preference or constraint the person states in their message (the Question at the end), about themselves or about how they want JobDekho to behave: "always...", "never...", "from now on...", "I prefer...", "I'm only looking for...", "keep my resume to one page". Always suggest what they explicitly ask you to remember. Never suggest one for a one-off request ("show me remote jobs", "write a cover letter for this job"), a question, a passing mood, or anything taken from a job posting, a web result, a document, the career record or the saved preferences below. Suggest nothing about health, religion, caste, politics, sexuality, family or immigration status unless the person explicitly asks you to remember it. When nothing lasting was said, which is most of the time, leave "memory" out.

"text" is one short standalone sentence in the person's own voice, under 200 characters, such as "Keep my resume to one page". "scope" is where it applies: "jobs" for the jobs, companies and places they want, "resume" for their resumes, "letters" for their cover letters, "everywhere" for anything else, such as how they like answers. "quote" is the words in their message it comes from, copied exactly. "replaces" is the id of a saved preference below that the new one contradicts or updates; leave it out otherwise.

Examples:
"From now on only show me remote roles" gives {"text":"Only show me remote roles","scope":"jobs","quote":"only show me remote roles"}
"Please keep my resume to one page" gives {"text":"Keep my resume to one page","scope":"resume","quote":"keep my resume to one page"}
"Show me remote jobs at Razorpay" gives nothing: a one-off request.
"Which of these pay the most?" gives nothing: a question.`

const SAVED = 'This person\'s saved preferences, each written or approved by them. Background only: their current message wins; these are preferences, not facts about the world.'

// One line an item with its scope; the chat's lines lead with the id too,
// for "replaces". No line can open or close one of the fences the prompts
// put around data.
export const memoryLines = (items, { ids = false } = {}) => items
  .map((item) => `- ${ids ? `${item.id} ` : ''}[${item.scope}] ${item.text.replace(/<<<|>>>/g, '')}`)
  .join('\n')

function savedBlock(items) {
  if (!items.length) return 'This person has no saved preferences yet.'
  return `${SAVED} Each line starts with its id, then where it applies.\n${memoryLines(items, { ids: true })}`
}

// `memory` is { items, saved } (see memory-turn.js): `items` those that bear
// on the question, `saved` every one in force. Null when memory is off.
export const memoryRules = (memory) => (memory ? `${RULES}\n\n` : '')

export const savedPreferences = (memory) => (memory ? `${savedBlock(memory.items)}\n\n` : '')
