// Run inside the page, stringified, in JobDekho's isolated world.

// What the person just pressed on, when it is a control whose list or
// calendar the browser draws as a separate popup: those popups are not part
// of the page's own pixels, so the live view would never show them. JobDekho
// draws its own list instead and sets the answer here.
export function pickerAt(x, y) {
  let el = document.elementFromPoint(x, y)
  while (el && el.shadowRoot) {
    const inner = el.shadowRoot.elementFromPoint(x, y)
    if (!inner || inner === el) break
    el = inner
  }
  if (!el || el.disabled || el.readOnly) return null
  const type = (el.getAttribute('type') || '').toLowerCase()
  const DATES = ['date', 'time', 'datetime-local', 'month', 'week', 'color']
  let kind = null
  let options = []
  if (el.tagName === 'SELECT' && !el.multiple) {
    kind = 'select'
    options = [...el.options].map((o) => ({ value: o.value, label: o.textContent.trim(), disabled: o.disabled }))
  } else if (el.tagName === 'INPUT' && DATES.includes(type)) {
    kind = type
  } else if (el.tagName === 'INPUT' && el.list) {
    kind = 'list'
    options = [...el.list.options].map((o) => ({ value: o.value, label: o.label || o.value, disabled: false }))
  }
  if (!kind) return null
  globalThis.__jdPick = el
  const box = el.getBoundingClientRect()
  return { kind, options: options.slice(0, 300), value: el.value, rect: { x: box.left, y: box.top, w: box.width, h: box.height } }
}

// The person's choice from JobDekho's list, set the way the page's own
// control would have set it.
export function applyPick(value) {
  const el = globalThis.__jdPick
  if (!el || !el.isConnected) return false
  const win = el.ownerDocument.defaultView
  const proto = el.tagName === 'SELECT' ? win.HTMLSelectElement.prototype : win.HTMLInputElement.prototype
  el.focus()
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  return true
}

// The wheel for a minimized window, which stops taking wheel events after a
// file chooser (measured): the nearest scrollable box under the pointer is
// scrolled directly, or the page when there is none.
export function scrollAt(x, y, dx, dy) {
  let el = document.elementFromPoint(x, y)
  while (el && el !== document.body && el !== document.documentElement) {
    const style = getComputedStyle(el)
    const scrolls = /(auto|scroll)/.test(style.overflowY + style.overflowX)
    if (scrolls && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)) break
    el = el.parentElement
  }
  const target = el && el !== document.body && el !== document.documentElement ? el : document.scrollingElement
  target.scrollBy(dx, dy)
  return true
}
