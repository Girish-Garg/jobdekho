// The scrape this server is running, held in memory for as long as it takes
// and its outcome kept after. The browser that started it polls here (see
// api/scrape.js), and a page reloaded mid-run asks here too and finds it still
// going, the way chat/in-flight.js keeps a question: the run belongs to the
// server, not to whichever request started it. One at a time, because two
// scrapes would fetch every source twice and race to write one corpus.
//
// Nothing is written to disk from here: a completed scrape records itself in
// runs.ndjson (see the store's recordRun), and a restart ends a run anyway.
const COULD_NOT = 'The refresh could not finish. The postings shown are from the last one that did.'

const iso = (ms) => new Date(ms).toISOString()

// `run({ onProgress })` does the scrape and resolves with what the browser is
// shown of it (see run.js). `log` gets the real error of a failed run; the
// state only ever holds the sentence, since a thrown error can name paths.
export function createScrapeJob({ run, now = Date.now, log = null }) {
  let state = { running: false, startedAt: null, finishedAt: null, done: 0, total: 0 }

  function progress({ done, total, current }) {
    if (state.running) state = { ...state, done, total, ...(current && { current }) }
  }

  function ended(outcome) {
    const { current, ...rest } = state
    state = { ...rest, running: false, finishedAt: iso(now()), ...outcome }
  }

  // Null when one is already running. Otherwise the run's promise, which
  // never rejects: a failure becomes the state's `error`, so it is seen by
  // whoever asks next rather than by whoever happened to be waiting.
  function start() {
    if (state.running) return null
    state = { running: true, startedAt: iso(now()), finishedAt: null, done: 0, total: 0 }
    return Promise.resolve()
      .then(() => run({ onProgress: progress }))
      .then(
        (result) => ended({ result }),
        (err) => {
          log?.error?.(err)
          ended({ error: COULD_NOT })
        },
      )
  }

  return { start, state: () => ({ ...state }), isRunning: () => state.running }
}
