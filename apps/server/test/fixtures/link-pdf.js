// A one-page PDF with real Link annotations over its text: the smallest that
// pdf.js reads both a text layer and links out of. `lines` are drawn top
// down from (50, 750) in 12pt Helvetica, 14pt apart, and each link is
// { rect: [x1, y1, x2, y2], url } in the same PDF points.
export function pdfWithLinks(lines, links = []) {
  const ops = lines.map((line, i) => `${i === 0 ? '' : '0 -14 Td '}(${line}) Tj`).join(' ')
  const content = `BT /F1 12 Tf 50 750 Td ${ops} ET`
  const annots = links.map(({ rect, url }) =>
    `<< /Type /Annot /Subtype /Link /Rect [${rect.join(' ')}] /Border [0 0 0] /A << /S /URI /URI (${url}) >> >>`)
  const refs = annots.map((_, i) => `${6 + i} 0 R`).join(' ')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> /Annots [${refs}] >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ...annots,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = []
  objects.forEach((body, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${body}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const o of offsets) pdf += `${String(o).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

// Where the words of DEMO_LINES sit, measured from Helvetica's widths, so a
// test can draw a link over exactly the words a person would have linked.
export const DEMO_LINES = ['Chess Engine | Demo video', 'Reach me at demo@example.com']
export const DEMO_LINKS = [
  { rect: [133, 746, 200, 762], url: 'https://www.youtube.com/watch?v=demo' },
  { rect: [120, 732, 236, 748], url: 'mailto:demo@example.com' },
]
