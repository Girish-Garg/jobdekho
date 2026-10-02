import { getDocumentProxy } from 'unpdf'
import { pairLinks } from './link-pairs.js'

// The only part of reading links that needs pdf.js: each page's annotations
// and its text items, handed as they are to pairLinks, which does the rest
// and is tested on plain objects.
export async function pdfLinks(bytes) {
  // A copy, since pdf.js may take ownership of the buffer it is given. Errors
  // only: a font warning about a file whose text was already read at upload
  // says nothing the server log needs.
  const pdf = await getDocumentProxy(new Uint8Array(bytes), { verbosity: 0 })
  try {
    const pages = []
    for (let n = 1; n <= pdf.numPages; n += 1) {
      const page = await pdf.getPage(n)
      const [annotations, content] = await Promise.all([page.getAnnotations(), page.getTextContent()])
      pages.push({ annotations, items: content.items })
    }
    return pairLinks(pages)
  } finally {
    await pdf.loadingTask.destroy()
  }
}
