// How fast the live view's frames are released. Chrome makes no new frame
// until the last one is acknowledged, so holding the acknowledgement is the
// rate cap itself: a busy page is slowed to the cap, a still page costs
// nothing. The slot is reserved before the wait, not after: several frames
// are in flight at once, and without reserving they all found the same free
// slot (measured at 39 frames a second when asked for 15).
export function pacer(now = Date.now) {
  let next = 0
  return (fps) => {
    const at = now()
    const slot = Math.max(at, next)
    next = slot + Math.round(1000 / fps)
    return slot - at
  }
}

// 15 a second while JobDekho fills (the person is watching), 30 while the
// person drives, where a lagging picture reads as a slow keyboard.
export const fpsFor = (state) => (state === 'yours' || state === 'review' ? 30 : 15)
