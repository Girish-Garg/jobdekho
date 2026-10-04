// The review page's script, sent inline with it (page.js). Keys: R right,
// W wrong, arrows to move, N the next one not yet checked.
export const SCRIPT = String.raw`
let state = null
let at = 0
const $ = (id) => document.getElementById(id)
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const escRe = (s) => s.replace(/[.*+?^${'$'}{}()|[\]\\]/g, '\\$&')

// Evidence words marked inside a piece of text, never inside a tag. A pair
// is marked word by word: the model's pairs skip little words like "and".
function markWords(text, words) {
  const spans = []
  for (const w of new Set(words.flatMap((pair) => pair.split(' ')))) {
    const re = new RegExp('(?<![\\p{L}\\p{N}])' + escRe(w) + '(?![\\p{L}\\p{N}])', 'giu')
    for (const m of text.matchAll(re)) spans.push([m.index, m.index + m[0].length])
  }
  spans.sort((a, b) => a[0] - b[0])
  let html = ''
  let pos = 0
  for (const [from, to] of spans) {
    if (from < pos) continue
    html += esc(text.slice(pos, from)) + '<mark>' + esc(text.slice(from, to)) + '</mark>'
    pos = to
  }
  return html + esc(text.slice(pos))
}

function marked(text, words, line) {
  const where = line ? text.indexOf(line) : -1
  if (where < 0) return markWords(text, words)
  const end = where + line.length
  return markWords(text.slice(0, where), words) + '<mark class="line">' + markWords(line, words) + '</mark>' + markWords(text.slice(end), words)
}

function render() {
  const p = state.progress
  $('progress').textContent = state.samples.length ? 'Sample ' + (at + 1) + ' of ' + p.total + ', ' + p.checked + ' checked, ' + p.wrong + ' wrong' : ''
  const a = state.audit
  $('result').textContent = a ? 'Done: ' + a.wrong + ' wrong of ' + a.checked + ', lower bound ' + (100 * a.lowerBound).toFixed(2) + '%, the 98% claim ' + (a.passed ? 'passes' : 'does not pass') : ''
  if (!state.samples.length) {
    $('main').innerHTML = '<p>The shipped model shows nothing on these postings, so there is nothing to review.</p>'
    return
  }
  const s = state.samples[at]
  const pre = state.precheck[s.id]
  const mine = state.verdicts[s.id]
  $('main').innerHTML =
    '<div class="muted">' + esc(s.company) + ' | ' + esc(s.source) + ' | ' + esc(s.id) + '</div>' +
    '<h2>' + markWords(s.title, s.words) + '</h2>' +
    '<div class="output">' + esc(s.output) + ' <span class="muted">confidence ' + s.confidence + '</span></div>' +
    (s.line ? '<div class="box">Line: ' + markWords(s.line, s.words) + '</div>' : '') +
    '<div class="muted">' + esc(s.evidence) + '</div>' +
    '<div class="box">' + (pre ? 'Claude pre-check: <b>' + esc(pre.verdict) + '</b> ' + esc(pre.note) : '<span class="muted">No pre-check yet.</span>') + '</div>' +
    '<div class="actions"><button class="right' + (mine?.verdict === 'right' ? ' chosen' : '') + '" id="right">Right (R)</button>' +
    '<button class="wrong' + (mine?.verdict === 'wrong' ? ' chosen' : '') + '" id="wrong">Wrong (W)</button>' +
    '<button id="prev">Previous</button><button id="next">Next</button><button id="todo">Next unchecked (N)</button></div>' +
    '<textarea id="note" placeholder="Note (optional)">' + esc(mine?.note) + '</textarea>' +
    '<div class="box text">' + marked(s.text, s.words, s.line) + '</div>'
  $('right').onclick = () => judge('right')
  $('wrong').onclick = () => judge('wrong')
  $('prev').onclick = () => go(at - 1)
  $('next').onclick = () => go(at + 1)
  $('todo').onclick = () => go(state.progress.resumeAt)
}

function go(i) {
  at = Math.max(0, Math.min(state.samples.length - 1, i))
  render()
  window.scrollTo(0, 0)
}

async function judge(verdict) {
  const s = state.samples[at]
  const note = $('note').value
  const res = await fetch('/api/verdict', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: s.id, verdict, note }) })
  const body = await res.json()
  if (!res.ok) return alert(body.error)
  state.verdicts[s.id] = { verdict, note }
  state.progress = body.progress
  if (body.audit) state.audit = body.audit
  go(body.progress.done ? at : body.progress.resumeAt)
}

document.addEventListener('keydown', (e) => {
  if (!state || e.target.tagName === 'TEXTAREA') return
  const key = e.key.toLowerCase()
  if (key === 'r') judge('right')
  else if (key === 'w') judge('wrong')
  else if (key === 'arrowleft') go(at - 1)
  else if (key === 'arrowright') go(at + 1)
  else if (key === 'n') go(state.progress.resumeAt)
})

fetch('/api/state').then((r) => r.json()).then((s) => {
  state = s
  go(s.progress.resumeAt)
})
`
