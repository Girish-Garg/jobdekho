import { execFile } from 'node:child_process'

// MiKTeX installs a missing package on first use, from the network, when a
// document asks for it. A document can now be written by the AI or edited
// by hand, so a \usepackage the guard somehow let through must not be able
// to fetch and run new code; MiKTeX's --disable-installer turns that off for
// one run without touching the person's MiKTeX settings. TeX Live has no
// such flag (and no on-the-fly installer), so it is only ever added for
// MiKTeX.
//
// A MiKTeX pdflatex almost always lives under a "MiKTeX" directory, which
// answers without starting a process. Otherwise `pdflatex --version` names
// the distribution in its first line; that probe is run once per binary and
// remembered, and a probe that fails reads as "not MiKTeX", so the flag is
// never added to a binary that might reject it.
const PROBE_TIMEOUT_MS = 10000
const known = new Map()

function versionText(path) {
  return new Promise((resolve, reject) => {
    execFile(path, ['--version'], { timeout: PROBE_TIMEOUT_MS, windowsHide: true }, (err, stdout) => {
      if (err) reject(err)
      else resolve(String(stdout))
    })
  })
}

export function isMiktex(path, { probe = versionText } = {}) {
  if (/miktex/i.test(path)) return Promise.resolve(true)
  if (!known.has(path)) known.set(path, probe(path).then((text) => /MiKTeX/i.test(text), () => false))
  return known.get(path)
}

export const installerFlags = async (path, miktex = isMiktex) => ((await miktex(path)) ? ['--disable-installer'] : [])
