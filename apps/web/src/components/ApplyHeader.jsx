import Button from './ui/Button.jsx';
import IconButton from './ui/IconButton.jsx';
import { CloseIcon, CopyIcon, SparkleIcon } from './Icon.jsx';

// Apply assist's top line: what this is and for which job, the promise it
// keeps (it fills, it never submits), and the two things always in reach:
// the details to copy and the way out.
export default function ApplyHeader({ posting, copying, onCopy, onClose }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
      <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <SparkleIcon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-md font-bold leading-tight text-ink">Apply assist</p>
        <p className="truncate text-xs text-muted">
          {posting.title} at {posting.company} · fills from your profile, never submits
        </p>
      </div>
      <Button size="sm" aria-pressed={copying} onClick={onCopy} variant={copying ? 'tint' : 'quiet'}>
        <CopyIcon size={12} />
        Copy your details
      </Button>
      <IconButton label="Close Apply assist" title="Close Apply assist" onClick={onClose}>
        <CloseIcon size={14} />
      </IconButton>
    </div>
  );
}
