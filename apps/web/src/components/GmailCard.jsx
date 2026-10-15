import Button from './ui/Button.jsx';
import { useMailAccount, KEPT_IN } from '../lib/useMailAccount.js';
import SettingsCard from './SettingsCard.jsx';
import GmailFields from './GmailFields.jsx';
import { CheckIcon, MailIcon } from './Icon.jsx';

const TONE = { ok: 'text-applied', error: 'text-ember', muted: 'text-muted' };
const APP_PASSWORDS = 'https://myaccount.google.com/apppasswords';
const LINK = 'link';

function Connected({ view }) {
  return (
    <>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-applied">
        <CheckIcon size={12} />
        Connected as {view.address}
      </p>
      <p className="mt-0.5 text-sm text-muted">
        The app password is kept in {KEPT_IN[view.keptIn] ?? 'protected storage'}. {view.sentToday} {view.sentToday === 1 ? 'mail' : 'mails'} sent in the last 24 hours.
      </p>
    </>
  );
}

// The person's own Gmail, for the mails they approve in the chat (see the
// server's api/mail.js). Connect checks the pair with Gmail before keeping
// it, so a wrong one is said here and not on the first mail.
export default function GmailCard() {
  const { view, address, setAddress, password, setPassword, busy, note, connect, disconnect } = useMailAccount();
  const typed = Boolean(address.trim() && password.trim());

  return (
    <SettingsCard icon={<MailIcon size={18} />} title="Gmail" hint="Sends the mails you approve in the chat, from your own Gmail.">
      <p className="text-sm text-muted">
        A mail goes only after you have seen it in the chat, from your own account, and lands in your Sent folder like any
        other. JobDekho talks to Gmail alone, keeps the app password in this computer&apos;s protected storage, and you can
        revoke it in your Google account at any time.
      </p>
      <ol className="mt-3 list-decimal space-y-0.5 pl-5 text-sm text-ink">
        <li>Turn on 2-Step Verification in your Google account.</li>
        <li>
          Create an app password at{' '}
          <a href={APP_PASSWORDS} target="_blank" rel="noreferrer" className={LINK}>myaccount.google.com/apppasswords</a>.
        </li>
        <li>Paste it here with your Gmail address.</li>
      </ol>

      <div className="mt-4">{view?.connected ? <Connected view={view} /> : <p className="text-sm font-semibold text-muted">Not connected.</p>}</div>

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (typed && !busy) connect();
        }}
      >
        <GmailFields address={address} password={password} onAddress={setAddress} onPassword={setPassword} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="primary" type="submit" disabled={!typed || Boolean(busy)}>
            {busy === 'connect' ? 'Checking with Gmail...' : view?.connected ? 'Connect another' : 'Connect'}
          </Button>
          {view?.connected && (
            <button type="button" onClick={disconnect} disabled={Boolean(busy)} className="text-sm font-medium text-ember hover:underline disabled:opacity-60">
              Disconnect
            </button>
          )}
        </div>
      </form>

      {/* Always mounted, so the outcome of each action is read out. */}
      <p aria-live="polite" className={`mt-3 min-h-[1.25rem] text-sm ${TONE[note?.tone] ?? ''}`}>{note?.text ?? ''}</p>
      <p className="text-xs text-muted">
        App passwords work for personal Gmail with 2-Step Verification on; Google does not offer them for most work or school
        accounts. Gmail's own daily sending limit applies. Disconnecting forgets the password here; revoke it at Google
        to end it for good.
      </p>
    </SettingsCard>
  );
}
