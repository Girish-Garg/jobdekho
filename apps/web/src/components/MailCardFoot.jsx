import { useNow } from '../lib/useNow.js';
import { shortStamp } from '../lib/time.js';
import Button from './ui/Button.jsx';
import { CheckIcon, CopyIcon, MailIcon } from './Icon.jsx';

const QUIET = 'font-medium text-muted hover:text-ink';

// "Sends in 0:17", counted from when the hold ends rather than ticked down,
// so a slow tab never shows more time than is left.
function Countdown({ endsAt }) {
  const now = useNow(true, 250);
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return <span className="text-sm font-semibold tabular-nums text-primary">Sends in 0:{String(left).padStart(2, '0')}</span>;
}

function Waiting({ mail, connected, act }) {
  if (connected === false) {
    return (
      <>
        <span className="text-sm text-ink">Connect Gmail in Settings to send it.</span>
        <Button variant="primary" onClick={act.openSettings}>Open Settings</Button>
        <Button onClick={act.copy}><CopyIcon size={13} />Copy mail</Button>
        <Button onClick={act.discard} className={QUIET}>Discard</Button>
      </>
    );
  }
  return (
    <>
      <Button variant="primary" onClick={act.send} disabled={connected === undefined}><MailIcon size={14} />Send</Button>
      <Button onClick={act.edit}>Edit</Button>
      <Button onClick={act.discard} className={QUIET}>Discard</Button>
      <span className="text-xs text-muted">It goes only when you press Send.</span>
    </>
  );
}

// The foot of a mail card: what the mail is waiting on, and the buttons for
// it. Stop is first while it counts down, since stopping is what a person
// who sees a mistake reaches for.
export default function MailCardFoot({ mail, phase, endsAt, connected, error, act }) {
  if (mail.status === 'applied') {
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-applied"><CheckIcon size={14} />Sent {mail.sentAt ? shortStamp(mail.sentAt) : ''}</span>
        {mail.from && <span className="text-muted">from {mail.from}.</span>}
        <button type="button" onClick={act.openTracker} className="font-medium text-ink underline-offset-2 hover:underline">See it in your Tracker</button>
      </p>
    );
  }
  if (mail.status === 'discarded') return <p className="text-sm text-muted">Discarded. Nothing was sent.</p>;
  if (mail.status === 'refused') return <p className="text-sm text-ember">{mail.reason}</p>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {phase === 'holding' && (
          <>
            <Countdown endsAt={endsAt} />
            <Button onClick={act.stop}>Stop</Button>
            <Button onClick={act.edit}>Edit</Button>
            <Button variant="primary" onClick={act.send}><MailIcon size={14} />Send now</Button>
          </>
        )}
        {phase === 'sending' && <span className="text-sm text-muted">Sending...</span>}
        {phase === 'asking' && <span className="text-sm text-muted">Pick what to attach above the box, and it counts down to send.</span>}
        {!['holding', 'sending', 'asking'].includes(phase) && <Waiting mail={mail} connected={connected} act={act} />}
      </div>
      {error && <p role="alert" className="text-sm text-ember">{error}</p>}
    </div>
  );
}
