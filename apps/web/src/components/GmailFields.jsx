import { useId, useState } from 'react';
import TextInput from './ui/TextInput.jsx';
import { Labelled } from './ProfileField.jsx';

// The Gmail address and the app password Google showed once. The password
// is a password field, with a toggle to check what was pasted, and neither
// is offered to the browser's autofill: a saved entry in a password manager
// would be the app password kept somewhere else.
export default function GmailFields({ address, password, onAddress, onPassword }) {
  const [shown, setShown] = useState(false);
  const passwordId = useId();
  const plain = { autoComplete: 'off', spellCheck: false, autoCapitalize: 'off' };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Labelled label="Gmail address">
        <TextInput {...plain} type="email" value={address} placeholder="you@gmail.com" onChange={(e) => onAddress(e.target.value)} />
      </Labelled>
      <div className="flex flex-col gap-1">
        <label htmlFor={passwordId} className="text-sm text-muted">App password</label>
        <div className="flex gap-2">
          <TextInput
            {...plain}
            id={passwordId}
            type={shown ? 'text' : 'password'}
            className="min-w-0 flex-1"
            value={password}
            placeholder="16 letters"
            onChange={(e) => onPassword(e.target.value)}
          />
          <button
            type="button"
            aria-pressed={shown}
            aria-controls={passwordId}
            onClick={() => setShown(!shown)}
            className="shrink-0 rounded-lg border border-line px-3 text-sm text-ink transition hover:border-edge"
          >
            Show
          </button>
        </div>
      </div>
    </div>
  );
}
