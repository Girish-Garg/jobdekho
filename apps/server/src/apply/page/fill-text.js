// Run inside the page, stringified, in JobDekho's isolated world, on fields
// the reader registered by id. They never press anything and never send a
// key: focusing and selecting is all it takes before the browser's own
// "insert text" (which fires the input events a person's typing does).

export function focusField(fid) {
  const el = globalThis.__jd?.byFid.get(fid)
  if (!el || !el.isConnected) return false
  el.scrollIntoView({ block: 'center', inline: 'nearest' })
  el.focus({ preventScroll: true })
  try {
    if (typeof el.select === 'function') el.select()
  } catch {
    // A type that has no selection (email in some engines) is simply focused.
  }
  return el.getRootNode().activeElement === el
}

// The value as the page now holds it, and the field let go of, which is when
// many forms run their own checks.
export function settleField(fid) {
  const el = globalThis.__jd?.byFid.get(fid)
  if (!el || !el.isConnected) return null
  el.blur()
  return typeof el.value === 'string' ? el.value : ''
}

// For a field that ignored inserted text: the prototype's own value setter,
// which a framework's controlled input cannot intercept (a plain assignment is
// swallowed by React's value tracker, measured), then the events it listens
// for.
export function setNative(fid, value) {
  const el = globalThis.__jd?.byFid.get(fid)
  if (!el || !el.isConnected) return null
  const win = el.ownerDocument.defaultView
  const proto = el.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype
    : el.tagName === 'SELECT' ? win.HTMLSelectElement.prototype : win.HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.blur()
  return el.value
}

// The names of the files a file input now holds.
export function fileNames(fid) {
  const el = globalThis.__jd?.byFid.get(fid)
  return el && el.files ? [...el.files].map((f) => f.name) : []
}

// The element itself, handed out as a remote object so the browser can set
// files on it directly.
export function fieldElement(fid) {
  return globalThis.__jd?.byFid.get(fid) ?? null
}
