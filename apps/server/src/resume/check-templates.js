import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { renderTex } from './render.js'
import { listTemplates } from './templates/registry.js'
import { PROFILE_SHAPES } from './check-shapes.js'

// `npm run resume:check`. The test suite deliberately never runs LaTeX (too
// slow, and it would fail on a machine without it), so nothing in it could
// have caught the header that ended a line which did not exist: every
// profile with no headline failed to compile while the golden .tex fixture
// matched perfectly. This compiles the real thing instead, one document per
// template per profile shape, and is the check to run after touching a
// template or the renderer.
export function checkTemplates({ log = console.log } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'jobdekho-resume-check-'))
  const failures = []
  try {
    for (const { id } of listTemplates()) {
      for (const [label, profile] of Object.entries(PROFILE_SHAPES)) {
        const name = `${id}-${label.replace(/[^a-z]+/gi, '-')}`
        writeFileSync(join(dir, `${name}.tex`), renderTex(id, profile, {}))
        try {
          execFileSync('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', '-no-shell-escape', `${name}.tex`], {
            cwd: dir, stdio: 'pipe', timeout: 90000,
          })
          if (!existsSync(join(dir, `${name}.pdf`))) failures.push(`${id} / ${label}: exit 0 but no PDF`)
          else log(`  ok    ${id} / ${label}`)
        } catch (err) {
          const line = String(err.stdout || '').split('\n').find((l) => l.startsWith('! ')) ?? err.message
          failures.push(`${id} / ${label}: ${line.trim()}`)
          log(`  FAIL  ${id} / ${label}: ${line.trim()}`)
        }
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  return failures
}

if (process.argv[1]?.endsWith('check-templates.js')) {
  const failures = checkTemplates()
  console.log(failures.length ? `\n${failures.length} failed` : '\nevery template compiled every shape')
  process.exit(failures.length ? 1 : 0)
}
