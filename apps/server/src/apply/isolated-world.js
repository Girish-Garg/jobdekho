import { send } from './cdp-call.js'

// JobDekho's own JavaScript world inside the page. The page shares the DOM
// with it but not a single variable: page scripts cannot see the field map,
// cannot replace the functions reading and filling, and a page that rewrites
// HTMLInputElement.prototype cannot fool the setter used here. DOM events
// still cross worlds, so the page's own handlers (React's) see every change.
//
// A navigation destroys the world with the document, so a call that finds it
// gone makes a new one and tries once more.
const GONE = /Cannot find context|context was destroyed|Execution context|No frame|detached/i

export function createWorld(cdp) {
  let contextId = null

  async function fresh() {
    const { frameTree } = await send(cdp, 'Page.getFrameTree')
    const made = await send(cdp, 'Page.createIsolatedWorld', { frameId: frameTree.frame.id, worldName: 'jobdekho' })
    contextId = made.executionContextId
  }

  async function run(expression, byValue) {
    if (contextId === null) await fresh()
    const answer = await send(cdp, 'Runtime.evaluate', {
      expression, contextId, returnByValue: byValue, awaitPromise: true,
    }, 10000)
    if (answer.exceptionDetails) {
      const why = answer.exceptionDetails.exception?.description || answer.exceptionDetails.text
      throw new Error(`The page refused a JobDekho read: ${String(why).split('\n')[0]}`)
    }
    return byValue ? answer.result.value : answer.result
  }

  async function evaluate(expression, byValue = true) {
    try {
      return await run(expression, byValue)
    } catch (err) {
      if (!GONE.test(String(err?.message))) throw err
      contextId = null
      return run(expression, byValue)
    }
  }

  return {
    evaluate,
    // One page function called with plain arguments.
    call: (fn, args = [], byValue = true) => evaluate(`(${fn})(...${JSON.stringify(args)})`, byValue),
    reset() {
      contextId = null
    },
  }
}
