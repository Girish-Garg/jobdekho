// The clocks one CLI run is held to. A CLI that prints its answer only at the
// end gets one: the whole run must end within `timeoutMs`. A CLI that writes
// as it goes (Antigravity always does, see agy.js) is held to how long it
// may go quiet instead (`quietMs`, reset by every piece of output), with
// `timeoutMs` as the outer limit, so a slow model still writing a long
// resume plan is not stopped mid-answer at a fixed few minutes. `onLimit`
// hears 'quiet' or 'cap', once.
export function runLimits({ timeoutMs, quietMs = null, onLimit }) {
  let quiet = null
  let over = false
  const hit = (how) => () => {
    if (over) return
    over = true
    onLimit(how)
  }
  const cap = setTimeout(hit('cap'), timeoutMs)
  const heard = () => {
    if (!quietMs || over) return
    clearTimeout(quiet)
    quiet = setTimeout(hit('quiet'), quietMs)
  }
  heard()
  return {
    heard,
    clear: () => {
      over = true
      clearTimeout(cap)
      clearTimeout(quiet)
    },
  }
}
