// Runs inside the page (it is stringified, so it may use nothing from this
// module): every document and open shadow root a form can live in, each
// with the offset that turns a rectangle inside it into one on the page.
// Web-component forms (SmartRecruiters' spl- controls) keep their fields in
// shadow roots; a same-origin frame is walked into, and a frame from another
// origin (a captcha, an ad) cannot be read and is never touched.
export function walkRoots() {
  const out = []
  const visit = (root, dx, dy, shadow) => {
    out.push({ root, dx, dy, shadow })
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) visit(el.shadowRoot, dx, dy, true)
      if (el.tagName !== 'IFRAME') continue
      let doc = null
      try {
        doc = el.contentDocument
      } catch {
        doc = null
      }
      if (!doc || !doc.documentElement) continue
      const box = el.getBoundingClientRect()
      visit(doc, dx + box.left + el.clientLeft, dy + box.top + el.clientTop, shadow)
    }
  }
  visit(document, 0, 0, false)
  return out
}
