import { fileSlug } from '../lib/fileSlug.js';
import { downloadBlob } from '../lib/downloadBlob.js';
import { downloadText } from '../lib/downloadText.js';
import DocumentName from './DocumentName.jsx';
import DocumentVersions from './DocumentVersions.jsx';
import DocumentDelete from './DocumentDelete.jsx';
import DocumentToolButton from './DocumentToolButton.jsx';
import SlidingPill from './SlidingPill.jsx';
import { useSlidingPill } from '../lib/useSlidingPill.js';
import { CodeIcon, DocumentIcon, DownloadIcon } from './Icon.jsx';

// Preview or source, as one control with two sides, so which one is
// showing is never a guess. A dot on Source says it holds unsaved edits,
// which matters most while the person is looking at the preview instead.
// The picked side is lit by one pill that glides across, as the nav's and
// the feed's Rows/Cards switch are (see useSlidingPill.js).
function ViewToggle({ view, onView, dirty }) {
  const pill = useSlidingPill(view);
  const side = (value, label, Icon) => (
    <button
      type="button"
      aria-pressed={view === value}
      data-pill-key={value}
      onClick={() => onView(value)}
      className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-fast ease ${
        view === value ? 'text-ink' : 'text-muted hover:text-ink'
      }`}
    >
      <Icon size={13} />
      {label}
      {value === 'source' && dirty && <span aria-hidden="true" title="Unsaved edits" className="h-1.5 w-1.5 rounded-full bg-primary" />}
    </button>
  );
  return (
    <div ref={pill.ref} role="group" aria-label="View" className="relative flex shrink-0 items-center rounded-full border border-line bg-paper p-0.5">
      <SlidingPill style={pill.style} glides={pill.glides} />
      {side('preview', 'Preview', DocumentIcon)}
      {side('source', 'Source', CodeIcon)}
    </div>
  );
}

// The thin bar over the open document: its name (renamed in place), the
// view, its history, the two ways out, and delete. The .tex download is
// the saved source, never needing LaTeX; the PDF is the one on screen.
export default function DocumentToolbar({ doc, pdf, view, onView, dirty, onRename, onRestore, onDelete }) {
  const slug = fileSlug(doc.name);
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2.5">
      <DocumentName key={doc.name} name={doc.name} onRename={onRename} />
      <ViewToggle view={view} onView={onView} dirty={dirty} />
      <DocumentVersions versions={doc.versions} onRestore={onRestore} />
      <DocumentToolButton label="Download PDF" disabled={!pdf.blob} onClick={() => downloadBlob(`${slug}.pdf`, pdf.blob)}>
        <DownloadIcon size={13} />
        PDF
      </DocumentToolButton>
      <DocumentToolButton label="Download .tex" onClick={() => downloadText(`${slug}.tex`, doc.tex)}>
        <DownloadIcon size={13} />
        .tex
      </DocumentToolButton>
      <DocumentDelete name={doc.name} onDelete={onDelete} />
    </div>
  );
}
