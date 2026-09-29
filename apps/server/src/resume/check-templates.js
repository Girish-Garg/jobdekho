import { renderTex } from './render.js'
import { renderLetter, placeholderLetter } from './render-letter.js'
import { compileTex } from './compile.js'
import { checkTex } from './guard/check.js'
import { listTemplates, LETTER_TEMPLATES } from './templates/registry.js'
import { PROFILE_SHAPES } from './check-shapes.js'

// `npm run resume:check`. The test suite deliberately never runs LaTeX (too
// slow, and it would fail on a machine without it), so nothing in it could
// have caught the header that ended a line which did not exist: every
// profile with no headline failed to compile while the golden .tex fixture
// matched perfectly. This compiles the real thing instead, one document per
// template per profile shape, and is the check to run after touching a
// template or the renderer.
//
// Each document goes the way a real one does: through the LaTeX guard
// first (a template the guard refused would make every first draft
// unusable), then compileTex, with the same flags the app uses, MiKTeX's
// package installer off included.
const POSTING = { title: 'Backend Engineer & SRE', company: 'R&D #1 Labs', location: 'Pune' }

function documents() {
  const out = []
  for (const { id } of listTemplates()) {
    for (const [label, profile] of Object.entries(PROFILE_SHAPES)) out.push({ id, label, tex: renderTex(id, profile, {}) })
  }
  for (const { id } of LETTER_TEMPLATES) {
    for (const [label, profile] of Object.entries(PROFILE_SHAPES)) {
      const text = `${placeholderLetter(profile, POSTING)}\n\n[A line that starts with a bracket]\n100% of C# & R&D`
      out.push({ id, label, tex: renderLetter(id, { profile, posting: label === 'name only' ? null : POSTING, text }) })
    }
  }
  return out
}

export async function checkTemplates({ log = console.log, compile = compileTex } = {}) {
  const failures = []
  for (const { id, label, tex } of documents()) {
    const { problems } = checkTex(tex)
    if (problems.length) {
      failures.push(`${id} / ${label}: refused by the guard: ${problems[0]}`)
      log(`  FAIL  ${id} / ${label}: refused by the guard: ${problems[0]}`)
      continue
    }
    try {
      await compile(tex, { timeoutMs: 90000 })
      log(`  ok    ${id} / ${label}`)
    } catch (err) {
      failures.push(`${id} / ${label}: ${err.message}`)
      log(`  FAIL  ${id} / ${label}: ${err.message}`)
    }
  }
  return failures
}

if (process.argv[1]?.endsWith('check-templates.js')) {
  const failures = await checkTemplates()
  console.log(failures.length ? `\n${failures.length} failed` : '\nevery template passed the guard and compiled every shape')
  process.exit(failures.length ? 1 : 0)
}
