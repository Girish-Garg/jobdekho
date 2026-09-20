// The follow-up every AI action gained: not a fresh prompt, but the answer
// already given plus what the person wants changed about it, so a refine
// costs one more call rather than starting over. Both go in their own fence,
// after whatever fences the action's own buildPrompt already used, so
// neither is mistaken for a rule or for the posting or resume above it.
const OPEN_PREVIOUS = '<<<PREVIOUS'
const CLOSE_PREVIOUS = 'PREVIOUS>>>'
const OPEN_CHANGE = '<<<CHANGE'
const CLOSE_CHANGE = 'CHANGE>>>'
const MARKERS = [OPEN_PREVIOUS, CLOSE_PREVIOUS, OPEN_CHANGE, CLOSE_CHANGE]

// Long enough for a full resume rewrite, the largest previous answer any
// action keeps; short enough that a runaway instruction cannot balloon the
// prompt.
const MAX_PREVIOUS = 20000
const MAX_INSTRUCTION = 2000

// Either text could carry a marker that closes its own fence early or opens
// the other one, so no marker survives inside either.
const fenced = (text, max) => MARKERS.reduce((s, m) => s.split(m).join(''), String(text || '').slice(0, max))

export function buildRefineSection(previousText, instruction) {
  return `${OPEN_PREVIOUS}\n${fenced(previousText, MAX_PREVIOUS)}\n${CLOSE_PREVIOUS}\n\n`
    + `${OPEN_CHANGE}\n${fenced(instruction, MAX_INSTRUCTION)}\n${CLOSE_CHANGE}\n\n`
    + 'Revise the previous answer above to follow that instruction, while still obeying every rule already given. '
    + 'Reply with ONE JSON object in the exact shape already given, and nothing else.\n'
}
