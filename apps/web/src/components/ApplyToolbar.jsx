import { CloseIcon, ExternalLinkIcon } from './Icon.jsx';

// The panel's top line: where the browser is, and the presses that are the
// person's at any moment. Take over stops JobDekho mid-fill (any press in the
// live view does too). Pop out brings the very same window onto the screen,
// with the form as it is, for a passkey, a sign-in popup, a file from the
// computer or a screen reader; it is not offered where the browser has no
// window. "Open in my browser" is the way through when a site will not work
// in this one.
const hostOf = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};

export default function ApplyToolbar({ view, onTakeOver, onPopOut, onOwnBrowser, onClose }) {
  const busy = view.state === 'starting' || view.state === 'filling';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-sm text-muted">
        <span className="font-semibold text-ink">{hostOf(view.url)}</span>
        {view.browser ? ` in ${view.browser}` : ''}
      </span>
      {busy && <button type="button" onClick={onTakeOver} className="btn btn-quiet btn-sm">Take over</button>}
      {view.canPopOut && (
        <button type="button" onClick={() => onPopOut(!view.shown)} className="btn btn-quiet btn-sm">
          {view.shown ? 'Back into JobDekho' : 'Pop out'}
        </button>
      )}
      <button type="button" onClick={onOwnBrowser} className="btn btn-quiet btn-sm">
        Open in my browser
        <ExternalLinkIcon size={12} />
      </button>
      <button type="button" onClick={onClose} aria-label="Close Apply assist" className="btn btn-ghost btn-icon">
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
