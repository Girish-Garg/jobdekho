// The same layout rules packages/sources/src/html-layout.js applies at
// ingest, for text the browser rebuilds itself (see scrubLeakedTags.js). The
// web app imports nothing from the packages, so the rules are restated here.
//
// Spaces collapse within a line and never across one; a bullet left alone on
// its line joins the text under it; a list stays one list; at most one blank
// line survives in a row.
export function layoutLines(text) {
  return text
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/ +([.,;:!?])(?=\s|$)/g, '$1')
    .replace(/^(?:-\n+)+(?=\S)/gm, '- ')
    .replace(/^- (?:- )+/gm, '- ')
    .replace(/^-$/gm, '')
    .replace(/^(- .*)\n\n+(?=- )/gm, '$1\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
