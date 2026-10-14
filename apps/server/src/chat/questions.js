// The questions a chat reply may ask the person, as Claude Code asks: a
// few short questions, each with options to press instead of an answer to
// type (see prompt-ask.js). The web app shows them above the chat's box,
// one at a time, and sends the picks back as the person's next message, so
// nothing here is ever acted on by the server. Model output bound for the
// screen, so every part is clamped to the shape the box was drawn for, and
// anything without a question and two options to pick from is dropped.
//
//   [{ header, question, options: [{ label, description }], multiSelect }]
const MAX_QUESTIONS = 3
const MAX_OPTIONS = 5
const MAX_HEADER = 14
const MAX_QUESTION = 240
const MAX_LABEL = 70
const MAX_DESCRIPTION = 140

// One line of plain text: the box draws no markup, and a line break inside
// an option would only push the next one down.
const line = (value, max) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')

function option(raw) {
  const label = line(raw?.label ?? raw, MAX_LABEL)
  return label ? { label, description: line(raw?.description, MAX_DESCRIPTION) } : null
}

function question(raw) {
  const text = line(raw?.question, MAX_QUESTION)
  const seen = new Set()
  const options = (Array.isArray(raw?.options) ? raw.options : [])
    .map(option)
    .filter((one) => one && !seen.has(one.label.toLowerCase()) && seen.add(one.label.toLowerCase()))
    .slice(0, MAX_OPTIONS)
  if (!text || options.length < 2) return null
  return { header: line(raw?.header, MAX_HEADER) || 'Question', question: text, options, multiSelect: raw?.multiSelect === true }
}

export function validateQuestions(raw) {
  return (Array.isArray(raw) ? raw : []).slice(0, MAX_QUESTIONS * 2).map(question).filter(Boolean).slice(0, MAX_QUESTIONS)
}
