import { readArgument } from './args.js'
import { MESSAGES } from './messages.js'

const words = (text) => text.trim().split(/\s+/)

// Packages that only typeset: page size, fonts, lists, headings, links,
// colour, tables. Everything the built-in templates load is here, and every
// one is on a plain MiKTeX install, which matters because documents compile
// with the package installer turned off (see resume/compile.js). A package
// can run any code it likes, so this list is part of the boundary, not a
// convenience: graphicx, listings, verbatim and their kin read files.
export const PACKAGES = new Set(words(`cmap geometry fontenc inputenc charter lmodern helvet mathptmx mathpazo
  times palatino enumitem titlesec hyperref xcolor color parskip tabularx array multicol microtype textcomp booktabs`))

const CLASSES = new Set(['article', 'letter'])

// A package option can name a file: fontenc loads <option>enc.def, and a
// key such as microtype's config= loads <value>.cfg. Without a slash, a
// backslash or a colon an option cannot spell a path, so it can only find
// files in TeX's own search path, and keys whose value is a file to load
// are refused by name. Class options count too: LaTeX offers them to every
// package, and key-value packages pick them up.
const OPTION_CHARS = /^[A-Za-z0-9\s.,=+\-!{}]*$/
const FILE_KEYS = /(?:^|[\s,{])(?:config|file|input|load)\w*\s*=/i
const OPTION_VALUES = { fontenc: new Set(['T1', 'OT1', 'LY1']), inputenc: new Set(['utf8']) }

const optionsSafe = (option) => option === null || (OPTION_CHARS.test(option) && !option.includes('..') && !FILE_KEYS.test(option))

function valuesAllowed(names, option) {
  if (option === null) return true
  const values = option.split(',').map((v) => v.trim()).filter(Boolean)
  return names.every((name) => !OPTION_VALUES[name] || values.every((v) => OPTION_VALUES[name].has(v)))
}

function checkClass({ option, group }, report) {
  if (!group) return report(MESSAGES.packageName('documentclass'))
  const name = group.text.trim()
  if (!CLASSES.has(name)) report(MESSAGES.documentClass(name))
  if (!optionsSafe(option)) report(MESSAGES.options('documentclass'))
}

function checkUse(command, { option, group }, report) {
  if (!group || group.inner.some((t) => t.type !== 'char')) return report(MESSAGES.packageName(command))
  const names = group.text.split(',').map((n) => n.trim()).filter(Boolean)
  for (const name of names) if (!PACKAGES.has(name)) report(MESSAGES.package(name))
  if (!optionsSafe(option) || !valuesAllowed(names, option)) report(MESSAGES.options(command))
}

export function checkPackages(tokens, report) {
  tokens.forEach((token, k) => {
    if (token.type !== 'cs') return
    if (token.name === 'documentclass') checkClass(readArgument(tokens, k), report)
    else if (token.name === 'usepackage' || token.name === 'RequirePackage') checkUse(token.name, readArgument(tokens, k), report)
  })
}
