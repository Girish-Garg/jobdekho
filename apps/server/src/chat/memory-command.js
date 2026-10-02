// Whether the person's own message asks for something to be kept: the one
// case in which a memory is saved without a click (see memory-turn.js).
// Decided here, in code, never by the model: a small local model cannot be
// trusted to tell a lasting preference from a passing request, but
// "remember" is unmistakable. Whole words in any case, so "remembered" or
// "remembers" does not count.
const COMMANDS = [
  /\bremember\b/i,
  /\b(?:don['’]?t|do\s+not)\s+forget\b/i,
  /\bkeep(?:\s+(?:this|that|it))?\s+in\s+mind\b/i,
  /\b(?:add|save)\s+(?:this|that|it)\s+to\s+(?:your\s+|my\s+)?memory\b/i,
  /\bnote\s+(?:this|that|it)\s+down\b/i,
]

// Past this a message is more likely pasted text, a job description say,
// than the person saying what to keep, and a "remember" inside it may be
// the posting's own words. Its suggestions still wait for a click.
const MAX_COMMAND = 400

export function isMemoryCommand(message) {
  const text = String(message ?? '')
  return text.length <= MAX_COMMAND && COMMANDS.some((pattern) => pattern.test(text))
}
