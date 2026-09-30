import { send, sleep, within } from './cdp-call.js'
import { pacer } from './frame-pace.js'

// The live view's pictures: Chrome's screencast, JPEG at quality 70 (about
// 30 to 36 KB a frame at 1280 wide, measured), with the rate held by the
// acknowledgement (see frame-pace.js). A screenshot poll is never used: it
// hangs on a minimized window, while the screencast keeps coming.
export const CAST = { format: 'jpeg', quality: 70, maxWidth: 1280, maxHeight: 960, everyNthFrame: 1 }

// Starts casting from one page's CDP session. `onFrame` gets the JPEG bytes
// and the viewport they show (CSS pixels and scroll offset), which is what a
// relayed click and the field highlights are measured against. `fps` is
// asked per frame so the rate follows who holds the wheel.
export async function startCast(cdp, { onFrame, fps = () => 15 }) {
  const wait = pacer()
  let live = true
  const onEvent = async ({ data, metadata, sessionId }) => {
    if (!live) return
    onFrame(Buffer.from(data, 'base64'), {
      w: Math.round(metadata.deviceWidth),
      h: Math.round(metadata.deviceHeight),
      sx: Math.round(metadata.scrollOffsetX ?? 0),
      sy: Math.round(metadata.scrollOffsetY ?? 0),
    })
    const ms = wait(fps())
    if (ms > 0) await sleep(ms)
    // Bounded: an ack sent into a session that just went away can hang, and
    // one that never settles would stop the picture for good.
    if (live) await within(cdp.send('Page.screencastFrameAck', { sessionId }), 2000, 'ack').catch(() => {})
  }
  cdp.on('Page.screencastFrame', onEvent)
  await send(cdp, 'Page.startScreencast', CAST)
  return {
    async stop() {
      live = false
      cdp.off('Page.screencastFrame', onEvent)
      await send(cdp, 'Page.stopScreencast').catch(() => {})
    },
  }
}
