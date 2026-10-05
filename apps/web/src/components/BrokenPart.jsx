import Button from './ui/Button.jsx';
import IconButton from './ui/IconButton.jsx';
import CopyDetailsButton from './CopyDetailsButton.jsx';
import { CloseIcon, WarningIcon } from './Icon.jsx';

// A panel that could not be drawn (the job pane, the chat), in the failure
// card's language (see BrokenScreen.jsx). It brings its own close button,
// since the panel's went down with the rest of it, and Try again draws the
// panel afresh. `titleId` names the heading for a dialog labelled by it.
export default function BrokenPart({ title, body, report, retry, onClose, titleId }) {
  return (
    <div role="alert" className="flex min-h-0 flex-1 flex-col">
      {onClose && (
        <div className="flex justify-end px-3 pt-3">
          <IconButton label="Close" onClick={onClose}><CloseIcon size={14} /></IconButton>
        </div>
      )}
      <div className="flex flex-col items-start gap-3 px-6 pb-6 pt-3">
        <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-ember/10 text-ember"><WarningIcon size={18} /></span>
        <h2 id={titleId} className="font-display text-md font-bold text-ink">{title}</h2>
        <p className="text-sm leading-relaxed text-ink/85">{body}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="tint" className="px-4 py-2" onClick={retry}>Try again</Button>
          <CopyDetailsButton text={report} className="px-4 py-2" />
        </div>
      </div>
    </div>
  );
}
