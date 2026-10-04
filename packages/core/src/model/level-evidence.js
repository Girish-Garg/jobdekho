// The hover for a level estimate names what pushed it most, in the words a
// person checks it against: "Estimated from: title words, the company's
// ladder, 'mentor engineers'". `words` are the same clues as they appear in
// the posting, so a page can mark them in the text.
//
// `pushes` is linear.js's list, strongest first. Description phrases are
// quoted; a single word inside an already quoted phrase adds nothing.
const MAX_PARTS = 3
const MAX_QUOTES = 2

export function levelEvidence(pushes) {
  const parts = []
  const words = []
  const quoted = []
  for (const { name } of pushes) {
    if (parts.length >= MAX_PARTS) break
    const [kind, text] = [name.slice(0, 2), name.slice(2)]
    if (text.startsWith('#')) continue
    if (kind === 't:') {
      if (!parts.includes('title words')) parts.push('title words')
      words.push(text)
    } else if (kind === 'c:') {
      if (!parts.includes("the company's ladder")) parts.push("the company's ladder")
    } else if (kind === 'd:' && quoted.length < MAX_QUOTES && !quoted.some((q) => q.split(' ').includes(text))) {
      quoted.push(text)
      parts.push(`'${text}'`)
      words.push(text)
    }
  }
  return {
    evidence: parts.length ? `Estimated from: ${parts.join(', ')}` : "Estimated from the posting's words",
    words: [...new Set(words)],
  }
}
