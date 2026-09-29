import { describe, it, expect } from 'vitest'
import { checkTex } from '@jobdekho/server/resume/guard/check.js'
import { renderTex } from '@jobdekho/server/resume/render.js'
import { renderLetter, placeholderLetter } from '@jobdekho/server/resume/render-letter.js'
import { listTemplates } from '@jobdekho/server/resume/templates/registry.js'
import { PROFILE_SHAPES } from '@jobdekho/server/resume/check-shapes.js'
import { MAX_TEX } from '@jobdekho/server/resume/guard/raw.js'

const PREAMBLE = '\\documentclass{article}\n\\begin{document}\n'
const doc = (body) => `${PREAMBLE}${body}\n\\end{document}\n`
const refused = (body) => checkTex(doc(body))
const INPUT = '"\\input" reads files from this computer, so it is not allowed in a document.'

describe('the LaTeX guard on the built-in templates', () => {
  // A template the guard refused would make every first draft uncompilable,
  // so this runs every template over every profile shape the template
  // check compiles for real (see resume/check-templates.js).
  for (const { id } of listTemplates()) {
    for (const [label, profile] of Object.entries(PROFILE_SHAPES)) {
      it(`passes ${id} rendered from "${label}"`, () => {
        expect(checkTex(renderTex(id, profile, {}))).toEqual({ ok: true, problems: [] })
      })
    }
  }

  it('passes the letter, with and without a posting, and with characters that mean something to LaTeX', () => {
    const profile = PROFILE_SHAPES['everything filled']
    const posting = { title: 'SDE & Intern', company: 'R&D #1 Co', location: 'Pune' }
    for (const text of [placeholderLetter(profile, posting), '[Starts with a bracket]\n100% of C# & R&D\n\n\\input{x} ^^5c']) {
      expect(checkTex(renderLetter('letter', { profile, posting, text }))).toEqual({ ok: true, problems: [] })
      expect(checkTex(renderLetter('letter', { profile: PROFILE_SHAPES['name only'], text }))).toEqual({ ok: true, problems: [] })
    }
  })

  it('passes a document that defines and uses its own commands and environments', () => {
    const tex = doc('\\newcommand{\\role}[2]{\\textbf{#1} \\hfill #2}\\newenvironment{tight}{\\begin{itemize}}{\\end{itemize}}'
      + '\\role{Engineer}{2024}\\begin{tight}\\item Shipped\\end{tight}\\newcommand{\\link}[1]{\\href{#1}{#1}}')
    expect(checkTex(tex)).toEqual({ ok: true, problems: [] })
  })
})

describe('the LaTeX guard refuses what reads or writes files', () => {
  it('says why \\input is refused, in one plain sentence', () => {
    expect(refused('\\input{/etc/passwd}')).toEqual({ ok: false, problems: [INPUT] })
  })

  it.each([
    ['\\include{secret}', 'include'], ['\\InputIfFileExists{secret}{}{}', 'InputIfFileExists'],
    ['\\openin5=secret', 'openin'], ['\\read5 to \\line', 'read'], ['\\includegraphics{C:/Users/me/id.png}', 'includegraphics'],
    ['\\verbatiminput{secret}', 'verbatiminput'], ['\\lstinputlisting{secret}', 'lstinputlisting'], ['\\font\\x=secret', 'font'],
  ])('refuses %s as a file read', (body, name) => {
    expect(refused(body).problems).toContain(`"\\${name}" reads files from this computer, so it is not allowed in a document.`)
  })

  it('refuses writing, and the shell escape reached through \\write18', () => {
    const { problems } = refused('\\immediate\\write18{calc}\\openout3=x.tex\\newwrite\\w')
    expect(problems).toEqual(expect.arrayContaining([
      '"\\immediate" writes files on this computer, so it is not allowed in a document.',
      '"\\write" writes files on this computer, so it is not allowed in a document.',
      '"\\openout" writes files on this computer, so it is not allowed in a document.',
    ]))
  })

  it.each(['pdfximage', 'pdfobj', 'pdffiledump', 'pdfmdfivesum', 'PDFXIMAGE', 'XeTeXpicfile', 'directlua', 'latelua', 'special', 'shipout'])(
    'refuses the engine primitive \\%s', (name) => {
      expect(refused(`\\${name}{secret}`).problems[0]).toMatch(/low-level engine command/)
    },
  )

  it('refuses the file-writing and verbatim environments', () => {
    expect(refused('\\begin{filecontents}{x.tex}\\end{filecontents}').problems[0]).toMatch(/writes files/)
    expect(refused('\\begin{verbatim}\\input{x}\\end{verbatim}').problems).toEqual(expect.arrayContaining([
      'The "verbatim" environment changes how TeX reads the text inside it, so it is not allowed in a document.',
    ]))
  })
})

describe('the LaTeX guard against ways of hiding a command', () => {
  it('refuses ^^ anywhere, since ^^5c spells a backslash', () => {
    for (const body of ['^^5cinput{secret}', '\\^^5c', 'text % ^^5cinput in a comment', 'x^^M']) {
      expect(refused(body).problems).toContain('"^^" is TeX\'s character-code notation, which can spell a hidden command, so it is not allowed in a document.')
    }
  })

  it('refuses building a name with \\csname, however it is wrapped', () => {
    expect(refused('\\csname input\\endcsname{secret}').problems[0]).toMatch(/"\\csname" can build or re-read/)
    expect(refused('\\expandafter\\x\\csname in\\endcsname').problems).toEqual(expect.arrayContaining([
      expect.stringMatching(/"\\expandafter" can build or re-read/), expect.stringMatching(/"\\csname"/),
    ]))
  })

  it('refuses re-reading text with \\scantokens, \\string and friends', () => {
    expect(refused('\\scantokens{\\string\\input secret}').problems).toEqual(expect.arrayContaining([
      expect.stringMatching(/"\\scantokens"/), expect.stringMatching(/"\\string"/), INPUT,
    ]))
    expect(refused('\\everyeof{}\\endlinechar=-1').ok).toBe(false)
  })

  it('refuses \\lowercase and \\uppercase, and \\INPUT in any case', () => {
    const { problems } = refused('\\lowercase{\\INPUT{secret}}')
    expect(problems).toContain('"\\lowercase" rewrites the characters inside it before TeX reads them, so it is not allowed in a document. Use \\MakeLowercase for text.')
    expect(problems).toContain('"\\INPUT" reads files from this computer, so it is not allowed in a document.')
  })

  it('never lets a definition vouch for a refused name', () => {
    for (const definer of ['newcommand', 'renewcommand', 'providecommand']) {
      expect(refused(`\\${definer}{\\input}{hello}\\input{secret}`).problems).toContain(INPUT)
      expect(refused(`\\${definer}{\\openin}{}\\openin5=secret`).ok).toBe(false)
    }
  })

  it('checks a definition body like any other text', () => {
    expect(refused('\\newcommand{\\cv}{\\input{secret}}\\cv').problems).toEqual([INPUT])
    expect(refused('\\newenvironment{x}{\\input{a}}{}').problems).toEqual([INPUT])
  })

  it('refuses raw TeX definitions, including of the active ~', () => {
    for (const body of ['\\def~{\\input}', '\\let~\\input', '\\edef\\x{}', '\\gdef\\x{}', '\\xdef\\x{}', '\\NewDocumentCommand\\x{v}{#1}']) {
      expect(refused(body).problems.some((p) => /defines commands in a way this check cannot follow/.test(p))).toBe(true)
    }
    expect(refused('\\catcode`\\~=13').problems[0]).toMatch(/"\\catcode"/)
    expect(refused('\\renewcommand{~}{\\input{secret}}').problems).toEqual([INPUT])
    expect(refused('\\makeatletter\\@input{x}').problems[0]).toMatch(/"\\makeatletter"/)
    expect(refused('\\ExplSyntaxOn').ok).toBe(false)
  })

  it('reads a comment exactly as far as TeX does, and no further', () => {
    expect(refused('% \\input{secret} is only a comment').ok).toBe(true)
    expect(refused('\\\\% after a line break, still a comment: \\input{x}').ok).toBe(true)
    // An escaped percent is text, so what follows it is not a comment.
    expect(refused('100\\%\\input{secret}').problems).toEqual([INPUT])
    // pdfTeX ends a line at a lone carriage return; the guard must too.
    expect(refused('% hidden?\r\\input{secret}').problems).toEqual([INPUT])
    expect(refused('% hidden?\r\n\\input{secret}').problems).toEqual([INPUT])
  })

  it('refuses \\verb, which reads what follows it with other character codes', () => {
    expect(refused('\\verb|%|\\input{x}').problems[0]).toMatch(/"\\verb" changes how TeX reads/)
  })

  it('refuses control characters and backslash lookalikes', () => {
    expect(refused('\\in\u0000put{secret}').problems).toContain('The document holds an invisible control character, which TeX may read differently than this check does. Remove it.')
    expect(refused('text\ffeed').ok).toBe(false)
    for (const ch of ['\uFF3C', '\uFE68', '\u2216', '\u29F5']) {
      expect(refused(`${ch}input{secret}`).problems[0]).toMatch(/looks like a backslash but is not one/)
    }
  })

  it('reads a control word as ASCII letters only, as TeX does', () => {
    // TeX reads "\in" and stops at the zero-width space; \in is not allowed
    // anyway, so this is refused, but as \in, never as \input.
    expect(refused('\\in\u200Bput{x}').problems).toEqual([expect.stringMatching(/^"\\in" is not on JobDekho's list/)])
  })

  it('names each problem once, and caps a pathological document', () => {
    expect(refused('\\input{a}\\input{b}\\input{c}').problems).toEqual([INPUT])
    expect(checkTex('x'.repeat(MAX_TEX + 1)).problems[0]).toMatch(/longer than/)
  })
})

describe('the LaTeX guard on links', () => {
  it('reads a link address as hyperref does, so a % in it cannot hide what follows', () => {
    const { problems } = refused('\\url{https://x.dev/%}\\input{secret}')
    expect(problems).toContain(INPUT)
    expect(problems.some((p) => p.startsWith('A link must start with'))).toBe(true)
  })

  it('refuses a link not followed directly by its address in braces', () => {
    expect(refused('\\url|%|\\input{secret}').ok).toBe(false)
    expect(refused('\\newcommand{\\u}{\\url}\\u|%|\\input{x}').problems[0]).toMatch(/"\\url" must be followed directly by its address/)
  })

  it('allows web, mail and phone links, and refuses files, scripts and odd characters', () => {
    expect(refused('\\href{https://github.com/x}{GitHub} \\url{mailto:a@b.co} \\href{tel:+919000000000}{call}').ok).toBe(true)
    for (const url of ['file:///C:/Users/me/secret.txt', 'javascript:alert(1)', 'run:calc.exe', 'https://x.dev/a b', 'https://x.dev/\\input']) {
      expect(refused(`\\href{${url}}{x}`).ok).toBe(false)
    }
  })
})

describe('the LaTeX guard on classes, packages and environments', () => {
  it('allows only the article and letter classes, with plain options', () => {
    expect(checkTex('\\documentclass[11pt,a4paper]{letter}').ok).toBe(true)
    expect(checkTex('\\documentclass{beamer}').problems).toEqual(['Only the article and letter document classes are allowed, not "beamer".'])
    expect(checkTex('\\documentclass[../../secret]{article}').problems[0]).toMatch(/could name a file/)
  })

  it('allows the templates\' packages and refuses the ones that read files or run code', () => {
    expect(checkTex('\\usepackage[margin=1in]{geometry}\\usepackage{enumitem,titlesec}\\usepackage[hidelinks]{hyperref}').ok).toBe(true)
    for (const name of ['graphicx', 'verbatim', 'listings', 'shellesc', 'catchfile', '../../secret']) {
      expect(checkTex(`\\usepackage{${name}}`).problems).toEqual([`The "${name}" package is not on JobDekho's list of safe packages, so it is not allowed in a document.`])
    }
    expect(checkTex('\\usepackage{geometry,graphicx}').ok).toBe(false)
    expect(checkTex('\\RequirePackage{\\x}').problems).toContain('"\\RequirePackage" needs plain package names in braces, like \\RequirePackage{geometry}.')
  })

  it('refuses package options that could name a file', () => {
    expect(checkTex('\\usepackage[T1]{fontenc}\\usepackage[utf8]{inputenc}').ok).toBe(true)
    for (const bad of ['\\usepackage[../x]{fontenc}', '\\usepackage[secret]{fontenc}', '\\usepackage[config=evil]{microtype}', '\\usepackage[C:/x]{geometry}']) {
      expect(checkTex(bad).ok).toBe(false)
    }
    expect(checkTex('\\usepackage[includeheadfoot, top=1cm]{geometry}').ok).toBe(true)
  })

  it('allows standard and document-defined environments, and nothing else', () => {
    expect(refused('\\begin{itemize}\\item a\\end{itemize}\\begin{tabular}{ll}a & b\\end{tabular}').ok).toBe(true)
    expect(refused('\\begin{tikzpicture}\\end{tikzpicture}').problems[0]).toMatch(/"tikzpicture" environment is not on/)
    expect(refused('\\begin{\\x}').problems).toContain('"\\begin" needs a plain environment name in braces, like \\begin{itemize}.')
  })

  it('refuses an unknown command, and says how to make one', () => {
    expect(refused('\\foo').problems).toEqual(['"\\foo" is not on JobDekho\'s list of safe LaTeX commands. Use a standard command, or define it with \\newcommand before it is used.'])
    expect(refused('\\newcommand\\foo{bar}\\foo').ok).toBe(true)
  })

  // Before its \renewcommand a name still has its original meaning, so the
  // document's definition can only vouch for the uses that come after it.
  it('counts a name as the document\'s own only after the command that defines it', () => {
    expect(refused('\\foo{x}\\renewcommand{\\foo}[1]{#1}').problems[0]).toMatch(/^"\\foo" is not on JobDekho's list/)
    expect(refused('\\begin{box}\\end{box}\\newenvironment{box}{}{}').problems[0]).toMatch(/"box" environment is not on/)
  })

  // LaTeX runs \name for \begin{name} and \endname for \end{name}, so an
  // environment name is a command name in disguise.
  it('refuses an environment whose name is a refused command', () => {
    expect(refused('\\begin{input}{secret}\\end{input}\\renewenvironment{input}{}{}').problems).toContain(INPUT)
    expect(refused('\\begin{csname}').problems[0]).toMatch(/"\\csname" can build or re-read/)
    expect(refused('\\begin{scantokens}{x}').ok).toBe(false)
  })

  it('treats a backslash at the very end as a control space', () => {
    expect(checkTex('text \\').ok).toBe(true)
  })
})
