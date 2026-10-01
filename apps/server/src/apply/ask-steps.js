// The AI's reply as fill steps (see ask-run.js): its { field, value } list,
// kept only for questions on the page's own list (ask-fields.js).

const norm = (text) => String(text).toLowerCase().replace(/\s+/g, ' ').trim()

// The option a reply names: its own words, or the one option starting with
// them. Anything looser is a guess, and nothing is ticked on a guess.
function optionNamed(options, value) {
  const want = norm(value)
  const exact = options.find((o) => norm(o.text) === want)
  if (exact) return exact
  const starts = options.filter((o) => norm(o.text).startsWith(want))
  return starts.length === 1 ? starts[0] : null
}

// The model's { field, value } list as steps fill-run.js can take, only for
// questions on the list above. Marked `answer`, which lets the guard replace
// what a field holds: the person asked for this value (see action-guard.js).
export function answerSteps(fills, byId) {
  const steps = []
  for (const fill of Array.isArray(fills) ? fills.slice(0, 40) : []) {
    const target = byId.get(String(fill?.field ?? ''))
    const value = typeof fill?.value === 'string' ? fill.value.slice(0, 4000) : ''
    if (!target || !value.trim()) continue
    if (target.act !== 'toggle') {
      steps.push({ fid: target.fid, action: target.act, value, answer: true, label: target.label })
      continue
    }
    for (const part of value.split(',').map((v) => v.trim()).filter(Boolean)) {
      const option = optionNamed(target.options, part)
      if (option) steps.push({ fid: option.fid, action: 'toggle', value: option.text, answer: true, label: option.text })
    }
  }
  return steps
}
