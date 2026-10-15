import { useMailScan } from '../lib/useMailScan.js';
import { resultLine, scanLine } from '../lib/mailScanWords.js';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';

const FIRST = 'JobDekho can read your Gmail for mail about your applications, from any site: confirmations, tests, interviews, offers and rejections, and file each one in your Tracker. It only reads; nothing is marked read, moved or deleted. The first scan looks through your whole mailbox and can take a few minutes.';
const AFTER = 'It checks for new mail every 15 minutes while JobDekho runs, and when it starts it catches up on the days it was closed. Mail it is not sure about is left out rather than filed wrong.';

// The scan of the person's mail, under the Gmail card's connection (see the
// server's api/mail-scan.js): the first scan by hand, then a scan now, the
// whole mailbox again, and Undo for the last one that changed the Tracker.
export default function GmailScanPanel() {
  const { status, error, scan, undo } = useMailScan();
  if (!status?.connected) return null;
  const first = !status.firstAt && !status.running;
  return (
    <Card variant="inset" aria-label="Scan your mail" className="mt-4 flex flex-col gap-2.5">
      <p className="text-sm font-semibold text-ink">Your applications, from your mail</p>
      <p className="text-sm text-muted">{first ? FIRST : AFTER}</p>
      <p aria-live="polite" className={`text-sm ${status.running ? 'text-primary' : 'text-ink/80'}`}>
        {scanLine(status)}{!status.running && status.last?.ok ? `. ${resultLine(status.last)}` : ''}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {first
          ? <Button variant="primary" onClick={() => scan()}>Scan my mail</Button>
          : (
            <>
              <Button onClick={() => scan()} disabled={status.running}>{status.running ? 'Scanning...' : 'Scan now'}</Button>
              <Button variant="ghost" onClick={() => scan({ full: true })} disabled={status.running}>Scan all my mail again</Button>
              {status.canUndo && <Button variant="ghost" onClick={() => undo()} disabled={status.running}>Undo last scan</Button>}
            </>
          )}
      </div>
      {error && <p role="alert" className="text-sm text-ember">{error}</p>}
    </Card>
  );
}
