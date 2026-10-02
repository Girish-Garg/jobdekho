import { useState } from 'react';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import { clearApplySignIns } from '../api/apply.js';
import { UserIcon } from './Icon.jsx';

// Apply assist's browser keeps the sign-ins made in it between applications
// (see the server's apply/profile-dir.js), so Internshala or LinkedIn is not
// a fresh sign-in every time. This takes them all away at once; not while an
// application is open in that browser, which the server says in its words.
export default function ApplySignIns() {
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  async function signOut() {
    setState('working');
    try {
      await clearApplySignIns();
      setState('done');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  }

  return (
    <Card as="li" variant="inset" className="flex flex-wrap items-start gap-3 sm:col-span-2">
      <span className="mt-0.5 shrink-0 text-muted"><UserIcon size={15} /></span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-semibold text-ink">Apply assist stays signed in</span>
        <span className="text-muted">
          Sites you sign in to in its browser remember you between applications, the way your own browser does. The
          sign-ins stay on this computer.
        </span>
        {state === 'error' && <span role="alert" className="mt-1 block text-xs text-ember">{error}</span>}
      </span>
      <Button variant="quiet" size="sm" disabled={state === 'working' || state === 'done'} onClick={signOut} className="shrink-0">
        {state === 'done' ? 'Signed out' : state === 'working' ? 'Signing out...' : 'Sign out of every site'}
      </Button>
    </Card>
  );
}
