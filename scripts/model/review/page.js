import { SCRIPT } from './page-script.js'

// The review page: one sample at a time, the model's output and the words
// that pushed it beside the posting, Claude's pre-check when there is one,
// and Right / Wrong. A maintainer tool, so plain and readable rather than
// the app's own look.
const STYLE = `
:root { color-scheme: light dark; --ink: #1d1d1f; --muted: #6b6b70; --line: #d9d9de; --paper: #fbfbfc; --mark: #ffe58a; --spot: #cfe6ff; --ok: #1f7a3f; --bad: #b3261e }
@media (prefers-color-scheme: dark) { :root { --ink: #ececf0; --muted: #a0a0a8; --line: #3a3a40; --paper: #17171a; --mark: #6b5a12; --spot: #1f4166 } }
* { box-sizing: border-box }
body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif }
header { position: sticky; top: 0; background: var(--paper); border-bottom: 1px solid var(--line); padding: 12px 24px; display: flex; gap: 16px; align-items: baseline; flex-wrap: wrap }
header h1 { font-size: 16px; margin: 0 }
main { max-width: 860px; margin: 0 auto; padding: 20px 24px 80px }
.muted { color: var(--muted) }
.output { font-size: 22px; font-weight: 600; margin: 8px 0 }
.box { border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; margin: 12px 0 }
.text { white-space: pre-wrap; max-height: 55vh; overflow: auto }
mark { background: var(--mark); color: inherit; border-radius: 3px; padding: 0 2px }
mark.line { background: var(--spot) }
.actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin: 14px 0 }
button { font: inherit; padding: 8px 16px; border-radius: 6px; border: 1px solid var(--line); background: transparent; color: inherit; cursor: pointer }
button.right { border-color: var(--ok); color: var(--ok) }
button.wrong { border-color: var(--bad); color: var(--bad) }
button.chosen { color: var(--paper) }
button.right.chosen { background: var(--ok) }
button.wrong.chosen { background: var(--bad) }
textarea { width: 100%; min-height: 54px; font: inherit; padding: 8px; border-radius: 6px; border: 1px solid var(--line); background: transparent; color: inherit }
.result { font-weight: 600 }
`

export function page(model) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Model review</title>
<style>${STYLE}</style>
</head>
<body>
<header><h1>Reviewing the ${model} model</h1><span id="progress" class="muted"></span><span id="result" class="result"></span></header>
<main id="main"><p class="muted">Loading...</p></main>
<script>${SCRIPT}</script>
</body>
</html>`
}
