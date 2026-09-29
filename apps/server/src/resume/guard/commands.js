// The control words a document may use: ordinary typesetting and nothing
// that reaches past the page. An allowlist rather than a list of bad names,
// because TeX has hundreds of primitives and packages add more, and a
// denylist is only as good as the author's memory of them. Anything not
// named here (or defined by the document itself, see definitions.js) is
// refused, so the cost of a gap is a refused document, never a leaked file.
const words = (text) => text.trim().split(/\s+/)

const TEXT = words(`textbf textit textsl textsc textsf texttt textrm textup textmd textnormal emph underline
  bfseries mdseries itshape slshape scshape upshape rmfamily sffamily ttfamily normalfont em bf it sl sc tt rm sf
  tiny scriptsize footnotesize small normalsize large Large LARGE huge Huge fontsize selectfont linespread
  MakeUppercase MakeLowercase textsuperscript textsubscript familydefault sfdefault rmdefault ttdefault baselinestretch`)

// Characters a resume prints, including the escapes resume/escape.js writes
// and the one-letter accents (\c{c}, \v{s}) a name may need.
const CHARACTERS = words(`textbackslash textasciitilde textasciicircum textbar textbullet textperiodcentered
  textendash textemdash textquoteleft textquoteright textquotedblleft textquotedblright textellipsis ldots dots
  textregistered texttrademark copyright textdegree textdollar textsterling texteuro textless textgreater
  textunderscore textbraceleft textbraceright textasteriskcentered textdagger dag ddag S P LaTeX TeX today
  c b d H t u v r k i j o O l L ae AE oe OE aa AA ss`)

// Math that turns up in resumes: a CGPA, "2x faster", an arrow.
const MATH = words(`times cdot cdots sim approx pm leq geq le ge neq rightarrow leftarrow Rightarrow Leftarrow
  leftrightarrow to uparrow downarrow infty bullet circ star ast diamond mathbf mathrm mathit mathsf mathtt
  frac sqrt log ensuremath alpha beta gamma delta mu pi sigma theta lambda Delta Sigma Omega`)

const LAYOUT = words(`vspace hspace vfill hfill vskip hskip kern smallskip medskip bigskip quad qquad enspace
  enskip thinspace negthinspace space nobreakspace hrulefill dotfill strut par noindent indent newline
  linebreak nolinebreak pagebreak nopagebreak newpage clearpage break nobreak centering raggedright raggedleft
  raggedbottom flushbottom sloppy fussy mbox makebox fbox framebox parbox raisebox phantom hphantom vphantom
  hrule vrule rule hbox leavevmode null unskip ignorespaces protect relax`)

const STRUCTURE = words(`documentclass usepackage RequirePackage begin end item section subsection subsubsection
  paragraph subparagraph title author date maketitle footnote hline cline multicolumn tabularnewline
  arraybackslash newcolumntype toprule midrule bottomrule pagestyle thispagestyle pagenumbering thepage`)

// \if, \relax and \detokenize are how the templates test for an empty
// argument (see templates/classic.tex); \detokenize turns tokens into plain
// characters, which can only make them less able to do anything.
const DEFINE = words(`newcommand renewcommand providecommand newenvironment renewenvironment newlength setlength
  addtolength settowidth newcounter setcounter addtocounter stepcounter value arabic roman Roman alph Alph
  if ifx else fi detokenize`)

// TeX's spacing parameters, set with \setlength or =.
const LENGTHS = words(`parindent parskip baselineskip itemsep topsep parsep partopsep leftmargin rightmargin
  labelsep labelwidth itemindent listparindent tabcolsep arraycolsep arrayrulewidth extrarowheight arraystretch
  doublerulesep columnsep columnseprule textwidth textheight linewidth columnwidth oddsidemargin evensidemargin
  topmargin headheight headsep footskip marginparwidth paperwidth paperheight fboxsep fboxrule emergencystretch
  hfuzz vfuzz tolerance pretolerance widowpenalty clubpenalty hyphenpenalty exhyphenpenalty`)

// What the allowed packages (see packages.js) and the letter class add.
// \href and \url are here, but their address is read and checked on its own
// (see links.js) because hyperref reads it with different character codes.
const PACKAGES = words(`geometry newgeometry restoregeometry titleformat titlespacing titlerule filcenter filright
  filleft thetitle thesection setlist setlistdepth newlist href url hypersetup urlstyle color textcolor colorbox
  fcolorbox definecolor colorlet pagecolor columnbreak microtypesetup
  opening closing signature address location telephone name cc encl ps`)

// The macros the built-in templates define (see templates/*.tex), allowed
// by name so a document that keeps using them after its preamble was
// rewritten is not refused for it.
const TEMPLATE_MACROS = words(`resHeader resHeaderLine resSection resEntryHeader resEntryHeaderPlain resMetaLine
  resEntrySpace resSkillRow letterHeader letterContact letterTo`)

export const ALLOWED_COMMANDS = new Set([
  ...TEXT, ...CHARACTERS, ...MATH, ...LAYOUT, ...STRUCTURE, ...DEFINE, ...LENGTHS, ...PACKAGES, ...TEMPLATE_MACROS,
])

// A backslash and one non-letter: line breaks, spacing, escaped specials
// and accents. `^` is safe here because "^^" is refused before any of this
// is read (see raw.js); "\n" stands for a backslash at a line end or at the
// very end of the text, which TeX reads as a control space.
export const ALLOWED_SYMBOLS = new Set([
  '\\', ',', ';', ':', '!', ' ', '\t', '\n', '\r', '&', '%', '$', '#', '_', '{', '}',
  "'", '`', '"', '^', '~', '=', '.', '-', '/', '@', '*', '[', ']', '(', ')', '|', '>', '<', '+',
])

export const ALLOWED_ENVIRONMENTS = new Set(words(`document itemize enumerate description center flushleft
  flushright quote quotation minipage tabular tabular* tabularx array multicols multicols* letter resItems`))
