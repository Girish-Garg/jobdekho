// A single pass over the ORIGINAL template text: each @@TOKEN@@ is replaced
// from a lookup, so a value that itself happens to contain the literal text
// "@@BODY@@" (a name pasted from somewhere strange) is never rescanned and
// substituted a second time. Doing this as sequential .replace() calls
// instead would have exactly that bug. Shared by every template renderer
// (render.js for resumes, render-letter.js for the cover letter).
export function fill(tex, values) {
  return tex.replace(/@@([A-Z]+)@@/g, (_, key) => values[key] ?? '')
}
