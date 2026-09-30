// Run inside the page, stringified: they may use nothing from this module.
//
// What a person reading the form would call a field. A label[for], then a
// wrapping label, then aria-labelledby and aria-label. Only the label's own
// words count: Lever wraps the whole field in its label, with the input and
// a status line ("Analyzing resume... Success!") inside it, and those are
// not what the field is called. Trailing required marks (* and the Lever
// star) are dropped: starredFor reads them, and the reader reports
// `required` on its own.
export function labelFor(el, root) {
  const clean = (text) => String(text || '').replace(/\s+/g, ' ').replace(/[*✱\s]+$/u, '').trim()
  const ownWords = (label) => {
    let text = ''
    for (const node of label.childNodes) {
      if (node === el || (node.contains && node.contains(el))) continue
      text += ` ${node.textContent || ''}`
      if (clean(text)) break
    }
    return clean(text) || clean(label.textContent)
  }
  if (el.id && root.querySelector) {
    const pointed = root.querySelector(`label[for="${CSS.escape(el.id)}"]`)
    if (pointed) return ownWords(pointed).slice(0, 200)
  }
  const wrapping = el.closest('label')
  if (wrapping) return ownWords(wrapping).slice(0, 200)
  const by = el.getAttribute('aria-labelledby')
  if (by) {
    const doc = el.ownerDocument
    const text = by.split(/\s+/).map((id) => (root.getElementById?.(id) || doc.getElementById(id))?.textContent || '').join(' ')
    if (clean(text)) return clean(text).slice(0, 200)
  }
  return clean(el.getAttribute('aria-label')).slice(0, 200)
}

// Whether the words naming a field end in a required mark (* or Lever's ✱).
// Many forms mark a required field only there and check it in their own
// script, so the input itself never says so. As in labelFor, only a wrapping
// label's words before the input count, unless its words all come after it
// (a checkbox's).
export function starredFor(el, root) {
  const STAR = /[*✱]\s*$/u
  const pointed = el.id && root.querySelector ? root.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null
  const label = pointed || el.closest('label')
  if (!label) return false
  let before = ''
  for (const node of label.childNodes) {
    if (node === el || (node.contains && node.contains(el))) break
    before += node.textContent || ''
  }
  return STAR.test(before) || (!before.trim() && STAR.test(label.textContent || ''))
}

// The question a choice belongs to: a radio's own label is its option
// ("Yes"), so the question is the fieldset's legend, or else the nearest text
// just before the control. The search stops at any other field on the way:
// text above another field is that field's question, not this one's. The
// other options of the same group are stepped over, and so are buttons, which
// ask nothing (a hidden file input sits behind its own "Attach" button). A
// trailing required mark is kept, even past the length cap: describeField
// counts it and takes it off.
export function questionFor(el) {
  const tidy = (text) => String(text || '').replace(/\s+/g, ' ').trim()
  const cut = (text) => (text.length > 200 && /[*✱]$/u.test(text) ? `${text.slice(0, 199)}*` : text.slice(0, 200))
  const clean = (text) => cut(tidy(text))
  const legend = el.closest('fieldset')?.querySelector('legend')
  if (legend) return clean(legend.textContent)
  const CONTROLS = 'input, select, textarea, [role="combobox"]'
  const controlsIn = (node) => [...(node.matches(CONTROLS) ? [node] : []), ...node.querySelectorAll(CONTROLS)]
  const sameGroup = (controls) => el.name && controls.every((c) => c.getAttribute('name') === el.name)
  let child = el
  for (let up = 0; up < 4 && child.parentElement; up += 1) {
    for (let prev = child.previousElementSibling; prev; prev = prev.previousElementSibling) {
      if (prev.matches('button, [role="button"]')) continue
      const controls = controlsIn(prev)
      if (controls.length && !sameGroup(controls)) return ''
      if (!controls.length && tidy(prev.textContent)) return clean(prev.textContent)
    }
    child = child.parentElement
  }
  return ''
}
