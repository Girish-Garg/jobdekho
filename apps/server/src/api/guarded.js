import { answer } from '../ai/ndjson.js'
import { beginCall, busyCall } from '../chat/in-flight.js'
import { busyRefusal, failureSentence } from '../chat/busy.js'
import { finishCall } from '../chat/drain.js'

// One AI call under the one-at-a-time rule (see chat/in-flight.js), served
// as every AI route serves its call (see ai/ndjson.js): refused with a 409
// naming the busy chat when another call runs, else run, and ended however
// it ends, a failure kept for the chat it ran in. Ending it also sends the
// follow-up that chat had waiting (see chat/drain.js).
//
// `call` is { chatId, kind, label, ... } as in-flight.js keeps it, and
// `work(emit)` does the call and resolves the success body.
export async function runGuarded(request, reply, deps, call, work) {
  const userId = request.user.sub
  if (!beginCall(userId, call)) return reply.code(409).send(await busyRefusal(deps, userId, busyCall(userId)))
  return answer(request, reply, async (emit) => {
    let failure = null
    try {
      return await work(emit)
    } catch (err) {
      failure = failureSentence(err)
      throw err
    } finally {
      finishCall(deps, userId, call.chatId, failure)
    }
  })
}
