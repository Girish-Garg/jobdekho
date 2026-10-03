import { createDocument } from '@jobdekho/store/documents.js'
import { getResumeSelection } from '@jobdekho/store/resume-selections.js'
import { callWithFallback } from '../ai/fallback.js'
import { ProviderError } from '../ai/errors.js'
import { resumeTailor } from '../actions/resume-tailor.js'
import { parseResumeTailor } from '../actions/resume-tailor-parse.js'
import { actionMemory } from '../actions/memory-note.js'
import { sharedPosting, buildSharedTailorPrompt } from '../actions/resume-tailor-shared.js'
import { renderTex } from '../resume/render.js'
import { applyPlanBullets } from '../resume/apply-plan.js'
import { tailoredSections } from '../resume/tailored-sections.js'
import { isKnownTemplate } from '../resume/templates/registry.js'
import { noteEvent, stopSignal } from './in-flight.js'
import { saveTurn, combinedTurn } from './save-turn.js'
import { TAILOR_ALL } from './busy.js'

// The layout the resume builder last had picked, the person's base resume
// as they chose to see it; Classic for someone who never picked one.
async function templateFor(store, userId) {
  const chosen = store.resumeSelections ? (await getResumeSelection(store, userId))?.template : null
  return isKnownTemplate(chosen) ? chosen : 'classic'
}

// "Tailor resume for all": one resume aimed at what the compared jobs
// share, planned from the career record the way one job's tailoring is,
// with the same checks on every reworded bullet (see actions/
// resume-tailor.js), then saved on the Resume page as a document of its
// own, "Tailored for Razorpay + Writesonic". One AI call, under the 'none'
// tool policy for the same reason as the single tailoring: the prompt holds
// the whole record. Its card is a turn of the comparison.
export async function tailorForAll(deps, { userId, chat, postings, profile, emit = () => {} }) {
  const watch = (event) => { noteEvent(userId, event); emit(event) }
  const memory = await actionMemory(deps.dashboard, userId, resumeTailor.memoryScope)
  const prompt = buildSharedTailorPrompt(postings, profile, memory)
  const { provider, text } = await callWithFallback({
    select: deps.select, policy: resumeTailor.tools, prompt, timeoutMs: resumeTailor.timeoutMs, emit: watch, signal: stopSignal(userId), ...deps.cli,
  })
  const plan = parseResumeTailor(text, { posting: sharedPosting(postings), context: { profile } })
  if (!plan) throw new ProviderError('unreadable', provider)
  const templateId = await templateFor(deps.store, userId)
  const tex = renderTex(templateId, applyPlanBullets(profile, plan), tailoredSections(profile, plan), { lead: plan.keywords.used })
  const name = `Tailored for ${postings.map((p) => p.company).join(' + ')}`
  const doc = await createDocument(deps.documents, userId, { name, kind: 'resume', templateId, postingId: null, tex, by: 'ai' })
  const turn = combinedTurn(chat, {
    question: TAILOR_ALL, provider: provider.id,
    answer: `Made "${doc.name}" from your career record, aimed at what these jobs share. It is on the Resume page.`,
    combined: {
      kind: 'tailor-all', documentId: doc.id, name: doc.name, jobs: postings.map((p) => p.id),
      keywords: plan.keywords, factCheck: plan.factCheck, coverage: plan.coverage,
    },
  })
  return { ...turn, chatId: await saveTurn(deps.store, userId, chat.id, turn) }
}
