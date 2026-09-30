// Every call into the browser has a time limit. A page can wedge a call for
// ever (a read on a page that never settles, a screenshot of a minimized
// window), and one that never answers would hold a session, a route and the
// person's click with it. What runs past its limit is abandoned, not undone.
export function within(promise, ms, what) {
  let timer
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} did not answer within ${ms} ms`)), ms)
    timer.unref?.()
  })
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer))
}

export function send(cdp, method, params = {}, ms = 5000) {
  return within(cdp.send(method, params), ms, method)
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
