import { callWithFallback } from '../ai/fallback.js'
import { ProviderError } from '../ai/errors.js'
import { parseJsonObject } from '../ai/loose-json.js'
import { replyStream } from '../chat/reply-stream.js'
import { askFields } from './ask-fields.js'
import { answerSteps } from './ask-steps.js'
import { askPrompt } from './ask-prompt.js'
import { scanPage } from './session-scan.js'
import { moveTo } from './session-state.js'
import { runFill } from './fill-run.js'
import { settle, contextOf } from './session-fill.js'
import { pushView } from './session-view.js'
import { checklistRows } from './checklist.js'
import { sleep } from './cdp-call.js'

// A paragraph for a form takes about as long as a cover letter; the same ceiling.
const TIMEOUT_MS = 3 * 60 * 1000
const MAX_REPLY = 3000
const KEEP_TURNS = 16
const CHANGING = 'The page was changing as you asked. Ask again once it has settled.'

// One message from the person to the AI beside the form. The page is read
// fresh (they may have moved on, or typed), the model answers with a reply
// and the answers to set, those are checked against the page's own questions
// (ask-fields.js) and set the way every fill is (fill-run.js): one field at a
// time, stopping the moment the person presses anything in the window. The
// message is their press, which is what lets JobDekho fill again after they
// took over. Resolves with { reply, filled: [{ label, result }] }.
export async function askOnPage(s, { message, resumeText, select, emit = () => {}, signal = null, seams = {} }) {
  try {
    await scanPage(s)
  } catch {
    return { reply: CHANGING, filled: [] }
  }
  const { list, byId } = askFields(s.scan.fields, s.verdicts)
  const prompt = askPrompt({ message, posting: s.posting, questions: list, values: s.values, resumeText, history: s.chat })
  const onText = replyStream(emit)
  const { provider, text } = await callWithFallback({ select, policy: 'none', prompt, timeoutMs: TIMEOUT_MS, emit, signal, onText, ...seams })
  onText.flush()
  const parsed = parseJsonObject(text)
  const reply = typeof parsed?.reply === 'string' ? parsed.reply.trim().slice(0, MAX_REPLY) : ''
  if (!reply) throw new ProviderError('unreadable', provider)
  const filled = await setAnswers(s, answerSteps(parsed.fill, byId))
  s.chat = [...s.chat, { who: 'you', text: message }, { who: 'ai', text: reply }].slice(-KEEP_TURNS)
  return { reply, filled }
}

async function setAnswers(s, steps) {
  if (!steps.length || s.closing || s.state === 'filling') return []
  moveTo(s, 'filling')
  pushView(s)
  const filled = []
  await runFill(contextOf(s), steps, (fid, result) => {
    s.results.set(fid, result)
    filled.push({ label: steps.find((step) => step.fid === fid)?.label ?? '', result })
    s.rows = checklistRows({ fields: s.scan.fields, verdicts: s.verdicts, results: s.results })
    pushView(s)
  })
  // Let the page finish reacting to the last value before it is read again.
  await sleep(400)
  const after = await scanPage(s).catch(() => ({}))
  if (s.state === 'filling') settle(s, after)
  return filled
}
