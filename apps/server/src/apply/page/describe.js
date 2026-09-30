// Runs inside the page, stringified: one control as plain data, everything
// the classifier on the server needs and nothing it should not have. A
// password, a one-time code or a card number is described but its value is
// never read, not even to see whether it is empty.
export function describeField(el, at) {
  const tag = el.tagName.toLowerCase()
  const type = (el.getAttribute('type') || '').toLowerCase()
  const box = el.getBoundingClientRect()
  const style = el.ownerDocument.defaultView.getComputedStyle(el)
  const visible = box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
  const ac = (el.getAttribute('autocomplete') || '').toLowerCase()
  const secret = type === 'password' || /password|one-time-code|cc-/.test(ac)
  const toggle = type === 'radio' || type === 'checkbox'
  const read = () => {
    if (tag === 'select') return el.value === '' ? '' : (el.selectedOptions[0]?.textContent || '').trim()
    if (type === 'file') return [...(el.files || [])].map((f) => f.name).join(', ')
    if (toggle) return el.checked ? 'on' : ''
    return typeof el.value === 'string' ? el.value : ''
  }
  const value = secret ? '' : read()
  const filled = value.trim() !== ''
  const label = at.labelFor(el, at.root)
  // A toggle's label is its option, so its question is looked for too; a
  // list, a combobox or a file input (often hidden behind its button) has a
  // question of its own only when nothing labels it.
  const list = tag === 'select' || el.getAttribute('role') === 'combobox' || type === 'file'
  const asked = toggle || (list && !label) ? at.questionFor(el) : ''
  // A required mark on the words is as good as one on the input: many forms
  // only mark the words, and check in their own script.
  const STAR = /[*✱]\s*$/u
  const marked = STAR.test(asked) || at.starredFor(el, at.root)
  return {
    tag,
    type,
    role: (el.getAttribute('role') || '').toLowerCase(),
    name: el.getAttribute('name') || '',
    id: el.id || '',
    ac,
    aria: el.getAttribute('aria-label') || '',
    label,
    question: asked.replace(/[*✱\s]+$/u, ''),
    placeholder: el.getAttribute('placeholder') || '',
    auto: el.getAttribute('data-automation-id') || '',
    qa: el.getAttribute('data-qa') || el.getAttribute('data-testid') || '',
    required: Boolean(el.required) || el.getAttribute('aria-required') === 'true' || marked,
    maxLength: el.maxLength > 0 ? el.maxLength : null,
    accept: el.getAttribute('accept') || '',
    options: tag === 'select' ? [...el.options].slice(0, 80).map((o) => o.textContent.trim()).filter(Boolean) : undefined,
    group: toggle ? el.getAttribute('name') || '' : '',
    checked: Boolean(el.checked),
    hasValue: filled,
    preview: value.slice(0, 80),
    visible,
    disabled: Boolean(el.disabled),
    readOnly: Boolean(el.readOnly),
    shadow: at.shadow,
    rect: {
      x: Math.round(box.left + at.dx + at.sx),
      y: Math.round(box.top + at.dy + at.sy),
      w: Math.round(box.width),
      h: Math.round(box.height),
    },
  }
}
