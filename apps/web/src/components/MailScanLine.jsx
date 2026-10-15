import { useMailScan } from '../lib/useMailScan.js';
import { scanLine } from '../lib/mailScanWords.js';
import Button from './ui/Button.jsx';

// The Tracker's line about the mail scan, under its title: a first scan to
// press when Gmail is connected and none has run, what a running one is
// doing, else when Gmail was last looked at, with Undo for the last scan
// that changed the board. Nothing at all without Gmail connected.
export default function MailScanLine() {
  const { status, error, scan, undo } = useMailScan();
  if (!status?.connected) return null;
  if (!status.firstAt && !status.running) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <Button size="sm" variant="tint" onClick={() => scan()}>Scan my mail</Button>
        <span>to bring in every application in your Gmail, from any site.</span>
        {error && <span role="alert" className="text-ember">{error}</span>}
      </div>
    );
  }
  const failed = status.last && !status.last.ok && !status.running;
  return (
    <p aria-live="polite" className="flex flex-wrap items-center gap-2 text-sm text-muted">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${status.running ? 'animate-pulse bg-primary' : failed ? 'bg-ember' : 'bg-applied'}`} />
      <span className={failed ? 'text-ember' : ''}>{scanLine(status)}</span>
      {status.canUndo && !status.running && (
        <button type="button" onClick={() => undo()} className="font-medium text-primary hover:underline">Undo last scan</button>
      )}
      {error && <span role="alert" className="text-ember">{error}</span>}
    </p>
  );
}
