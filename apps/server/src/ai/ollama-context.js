// How much context an Ollama call asks for. Ollama's own default is small, set
// from the VRAM it finds (4,096 tokens on an 8 GB GPU, measured on 0.32.12),
// and a prompt longer than the context loses its START without a word, which
// is exactly where every JobDekho prompt keeps its instruction. Measured: the
// same 54,000-character prompt was cut to 4,098 tokens at the default and
// answered a question it never asked, and read whole (11,986 tokens) and
// answered right with the context sized to it.
//
// Three characters to a token is fewer than that prompt took (4.5), so the
// guess errs long, which costs memory rather than the instruction. The reply
// needs room of its own on top: the longest JobDekho asks for is a whole .tex
// document from the chat on the resume page. Sizes are powers of two from
// 16,384 up because Ollama reloads the model whenever the size changes (13 s
// measured), and a few fixed sizes keep that to the first call of each.
const CHARS_PER_TOKEN = 3
const REPLY_TOKENS = 8192
const SMALLEST = 16384

// Less room than this for the reply means the prompt all but fills the model.
export const MIN_REPLY_TOKENS = 1024

// `numPredict` caps the reply at whatever the context has left, so a long
// reply stops and says so (done_reason "length") rather than pushing the
// prompt's start out of the context to keep going. `modelMax` is the model's
// own limit when Ollama reports one.
export function contextFor(prompt, modelMax = null) {
  const promptTokens = Math.ceil(String(prompt).length / CHARS_PER_TOKEN)
  let size = SMALLEST
  while (size < promptTokens + REPLY_TOKENS) size *= 2
  const numCtx = modelMax ? Math.min(size, modelMax) : size
  return { promptTokens, numCtx, numPredict: numCtx - promptTokens }
}
