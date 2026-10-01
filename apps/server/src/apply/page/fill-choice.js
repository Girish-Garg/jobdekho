// Run inside the page, stringified, in JobDekho's isolated world.

// Picks the option of a native select whose text is the answer: the same
// words first, then one that starts with them. Numbers must match exactly,
// so "2" never picks "20+ years". Null when nothing fits.
export function chooseOption(fid, wanted, exact) {
  const el = globalThis.__jd?.byFid.get(fid)
  if (!el || el.tagName !== 'SELECT') return null
  const norm = (t) => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim()
  const want = norm(wanted)
  const options = [...el.options].filter((o) => !o.disabled)
  const hit = options.find((o) => norm(o.textContent) === want)
    || (!exact && options.find((o) => norm(o.textContent).startsWith(want)))
  if (!hit) return null
  const proto = el.ownerDocument.defaultView.HTMLSelectElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, hit.value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  return hit.textContent.trim()
}

// The suggestions a typed-into combobox is showing, with where each sits on
// screen so the browser can press it the way a mouse would. Options the page
// marks as options first; Lever's location list marks nothing, so its own
// class is asked for when nothing else is there.
export function optionsFor(fid) {
  const el = globalThis.__jd?.byFid.get(fid)
  if (!el) return []
  const doc = el.ownerDocument
  const listId = el.getAttribute('aria-controls') || el.getAttribute('aria-owns')
  const scope = (listId && doc.getElementById(listId)) || doc
  let pool = [...scope.querySelectorAll('[role="option"]')]
  if (!pool.length) pool = [...doc.querySelectorAll('.dropdown-location, [class*="suggestion" i] li, [class*="autocomplete" i] li')]
  return pool.map((o) => {
    const box = o.getBoundingClientRect()
    return { text: (o.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120), x: Math.round(box.left + Math.min(box.width / 2, 40)), y: Math.round(box.top + box.height / 2), shown: box.width > 0 && box.height > 0 }
  }).filter((o) => o.shown && o.text).slice(0, 40)
}

// Whether the combobox now shows the whole picked option, in its input or in
// the few elements around it where a picked value is drawn. A list still open
// with the option in it is not a pick, so text inside a list is left out.
export function comboShows(fid, text) {
  const el = globalThis.__jd?.byFid.get(fid)
  if (!el) return false
  const norm = (t) => String(t || '').toLowerCase().replace(/\s+/g, ' ')
  const want = norm(text)
  if (norm(el.value).includes(want)) return true
  const outsideLists = (root) => {
    const walker = root.ownerDocument.createTreeWalker(root, 4)
    let out = ''
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.parentElement?.closest('[role="listbox"], [role="option"]')) out += ` ${node.textContent}`
    }
    return out
  }
  let node = el
  for (let up = 0; up < 4 && node.parentElement; up += 1) {
    node = node.parentElement
    if (norm(outsideLists(node)).slice(0, 600).includes(want)) return true
  }
  return false
}

// Ticks a radio button or checkbox, the way a click on it would, which is what
// a page's own script listens for. Only ever on: a person who asked for one
// option of a set gets that one, and nothing is unticked for them. Null when
// the control is gone or is not a toggle.
export function checkToggle(fid) {
  const el = globalThis.__jd?.byFid.get(fid)
  if (!el || (el.type !== 'radio' && el.type !== 'checkbox')) return null
  if (!el.checked) el.click()
  return el.checked
}
