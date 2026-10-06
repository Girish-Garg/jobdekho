import { memoryKey } from '@jobdekho/store/memory.js'
import { isMemoryCommand } from '../chat/memory-command.js'
import { spotPhrases } from './phrases.js'
import { rememberedLine } from './remember.js'
import { spotHabit } from './habits.js'

const MAX_OFFERS = 3

const flat = (value) => String(value ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

// Two offers drawn from the same words are one offer; the earlier, surer
// one stays.
const sameWords = (a, b) => {
  const x = flat(a.quote)
  const y = flat(b.quote)
  return Boolean(x && y) && (x.includes(y) || y.includes(x))
}

// Everything a chat turn offers to remember, surest first: what the AI read
// in the message (already traced back to it, see chat/memory-suggest.js),
// what an explicit "remember" asks for when the AI offered nothing
// (remember.js), what the phrasing says plainly (phrases.js), and last a
// habit across chats (habits.js). Never one already saved, at most three, each
// tagged with where it came from, which its chip sends back with Save or
// Not now (see packages/store/src/memory-feedback.js).
export function spotMemory({ message, offered = [], saved = [], past = [], feedback = [], chatId = null, now = Date.now() }) {
  const known = new Set(saved.map((item) => memoryKey(item.text)))
  const out = []
  const add = (offer) => {
    if (!offer || out.length >= MAX_OFFERS || known.has(memoryKey(offer.text))) return
    if (offer.source !== 'habit' && out.some((kept) => sameWords(kept, offer))) return
    known.add(memoryKey(offer.text))
    out.push(offer)
  }
  for (const offer of offered) add({ ...offer, source: 'ai' })
  if (!out.length && isMemoryCommand(message)) add(rememberedLine(message))
  for (const offer of spotPhrases(message)) add(offer)
  add(spotHabit({ message, chatId, past, saved, feedback, now }))
  return out
}
