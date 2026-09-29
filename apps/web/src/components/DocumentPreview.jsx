import CompileFailure from './CompileFailure.jsx';

// Measured on Chrome's viewer with its toolbar hidden: 5px of grey either
// side of a width-fitted page and 3px above it.
const CROP = { side: 5, top: 3 };

// The compiled PDF on the page's own paper, in the browser's viewer with
// its toolbar hidden: the workspace's toolbar already downloads it, and
// fitting the page to the width is what makes a resume readable beside the
// chat. While a new compile runs, the last PDF stays up under a small
// "Compiling" chip rather than blinking out.
export default function DocumentPreview({ pdf, onOpenSource }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-paper p-4">
      {pdf.busy && (
        <span aria-live="polite" className="absolute right-7 top-7 z-10 inline-flex items-center gap-2 rounded-full border border-line bg-overlay px-3 py-1 text-xs font-semibold text-ink shadow-pop">
          <span aria-hidden="true" className="breathe h-2 w-2 rounded-full bg-primary" />
          Compiling...
        </span>
      )}
      {pdf.failure ? (
        <CompileFailure failure={pdf.failure} onOpenSource={onOpenSource} onRetry={pdf.retry} />
      ) : pdf.url ? (
        // Chrome's viewer frames the page in a few pixels of its own dark
        // grey, which read as a heavy black rule on the marigold paper; the
        // frame is cropped just past that edge so the page sits on our own.
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-line bg-panel shadow-raise">
          <iframe
            title="PDF preview"
            src={`${pdf.url}#toolbar=0&navpanes=0&view=FitH`}
            style={{ margin: `-${CROP.top}px -${CROP.side}px 0`, width: `calc(100% + ${2 * CROP.side}px)`, height: `calc(100% + ${CROP.top}px)` }}
            className="block"
          />
        </div>
      ) : (
        <div aria-hidden="true" className="breathe mx-auto aspect-[1/1.3] w-full max-w-2xl rounded-xl border border-line bg-panel shadow-raise" />
      )}
    </div>
  );
}
