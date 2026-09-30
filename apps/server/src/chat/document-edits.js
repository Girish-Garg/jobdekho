// A chat change to a document as a list of targeted edits, each
// { find, replace }, applied here to the source the model was shown. Asking
// for the few lines that change rather than the whole file keeps a reply
// short and fast, and leaves every line the model did not mean to touch
// exactly as the person had it: a whole-file rewrite also "fixed" spacing,
// comments and macros nobody asked about.
//
// Every `find` is matched against the source as it is, not after the other
// edits, and must be found exactly once there: text the model misremembered
// or that could be any of several places is refused with the reason, never
// guessed at, because a guess changes the wrong line of someone's resume.
// No two edits may touch the same text. Resolves { tex } or { refused }.
export const MAX_EDITS = 30

const lines = (text) => String(text).replace(/\r\n?/g, '\n')

// The start of the text the model meant, on one line, enough to recognise.
function quote(find) {
  const first = find.trim().split('\n')[0]
  return first.length > 60 ? `${first.slice(0, 57)}...` : first
}

function occurrences(text, find) {
  let count = 0
  for (let at = text.indexOf(find); at !== -1; at = text.indexOf(find, at + 1)) count += 1
  return count
}

const couldNot = (why) => ({ refused: `The change could not be made: ${why}` })

function spanOf(text, edit, name) {
  const find = typeof edit?.find === 'string' ? lines(edit.find) : ''
  if (!find.trim() || typeof edit.replace !== 'string') return couldNot('one of its edits did not say which text to replace or what with. Ask for it again.')
  const count = occurrences(text, find)
  if (count === 0) {
    return couldNot(`the text it replaces ("${quote(find)}") is not in "${name}" as it is now. Ask again, and the change will start from the current text.`)
  }
  if (count > 1) {
    return couldNot(`the text it replaces ("${quote(find)}") appears ${count} times in "${name}", so JobDekho cannot tell which one was meant. Ask for it again.`)
  }
  const at = text.indexOf(find)
  return { at, end: at + find.length, replace: lines(edit.replace) }
}

export function applyEdits(source, edits, name) {
  if (edits.length > MAX_EDITS) return couldNot(`it had more than ${MAX_EDITS} separate edits. Ask for it in smaller steps, or as a whole new version.`)
  const text = lines(source)
  const spans = []
  for (const edit of edits) {
    const span = spanOf(text, edit, name)
    if (span.refused) return span
    spans.push(span)
  }
  spans.sort((a, b) => a.at - b.at)
  if (spans.some((span, i) => i > 0 && span.at < spans[i - 1].end)) {
    return couldNot(`two of its edits change the same text in "${name}". Ask for it again.`)
  }
  let tex = ''
  let from = 0
  for (const span of spans) {
    tex += text.slice(from, span.at) + span.replace
    from = span.end
  }
  return { tex: tex + text.slice(from) }
}
