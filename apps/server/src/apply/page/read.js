import { walkRoots } from './walk.js'
import { labelFor, questionFor, starredFor } from './label.js'
import { describeField } from './describe.js'

// Runs inside the page, stringified, in JobDekho's isolated world: the page's
// own scripts can neither see the map of field ids kept here nor replace the
// functions doing the reading. Ids are stable for as long as the document
// lives, so a later read, the fill and the checklist all mean the same field.
export function readPage(walk, helpers, describe) {
  const store = globalThis.__jd || (globalThis.__jd = { byFid: new Map(), ids: new WeakMap(), next: 0 })
  const sx = window.scrollX
  const sy = window.scrollY
  const fields = []
  const buttons = []
  const SKIP = ['hidden', 'submit', 'button', 'reset', 'image', 'search']
  for (const at of walk()) {
    const ctx = { ...at, sx, sy, ...helpers }
    for (const el of at.root.querySelectorAll('input, select, textarea, [role="combobox"]')) {
      if (SKIP.includes((el.getAttribute('type') || '').toLowerCase())) continue
      // A combobox wrapper around a real input: the input is the field.
      if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && el.querySelector('input')) continue
      let fid = store.ids.get(el)
      if (!fid) {
        store.next += 1
        fid = `f${store.next}`
        store.ids.set(el, fid)
      }
      store.byFid.set(fid, el)
      fields.push({ fid, ...describe(el, ctx) })
    }
    for (const b of at.root.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]')) {
      const box = b.getBoundingClientRect()
      const text = (b.innerText || b.value || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()
      if (!text || box.width === 0 || box.height === 0) continue
      const type = (b.getAttribute('type') || '').toLowerCase()
      buttons.push({
        text: text.slice(0, 60),
        // A button with no type inside a form submits it.
        submits: Boolean(b.form) && (type === 'submit' || (b.tagName === 'BUTTON' && type === '')),
        rect: { x: Math.round(box.left + at.dx + sx), y: Math.round(box.top + at.dy + sy), w: Math.round(box.width), h: Math.round(box.height) },
      })
    }
  }
  const frames = [...document.querySelectorAll('iframe')].map((f) => {
    const box = f.getBoundingClientRect()
    return { src: f.src || '', w: Math.round(box.width), h: Math.round(box.height) }
  })
  const text = (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 3000)
  return { url: location.href, title: document.title, text, frames, fields: fields.slice(0, 300), buttons: buttons.slice(0, 80) }
}

// The label helpers travel as one object, each function as its own source.
const HELPERS = `{ labelFor: ${labelFor}, questionFor: ${questionFor}, starredFor: ${starredFor} }`

export const READ_PAGE = `(${readPage})(${walkRoots}, ${HELPERS}, ${describeField})`

// One field, described again right before JobDekho acts on it: the page may
// have changed it, moved it or put something else in its place since the read.
export function describeOne(fid, helpers, describe) {
  const el = globalThis.__jd?.byFid.get(fid)
  if (!el || !el.isConnected) return null
  const root = el.getRootNode()
  return describe(el, { root, dx: 0, dy: 0, sx: window.scrollX, sy: window.scrollY, shadow: root !== document, ...helpers })
}

export const describeExpression = (fid) =>
  `(${describeOne})(${JSON.stringify(fid)}, ${HELPERS}, ${describeField})`
