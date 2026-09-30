import { useId, useState } from 'react';
import { BOX, Labelled } from './ProfileField.jsx';

// The two things Adzuna's developer page hands out: the app id, a plain
// field since it is an identifier the card shows anyway, and the key, a
// password field so it is not on screen for anyone looking over a shoulder,
// with a toggle to check what was pasted. Neither is offered to the
// browser's autofill: this is not a sign-in form, and a saved password
// manager entry would be the key kept somewhere else.
export default function AdzunaKeyFields({ appId, appKey, keyEnd, onAppId, onAppKey }) {
  const [shown, setShown] = useState(false);
  const keyId = useId();
  const plain = { autoComplete: 'off', spellCheck: false, autoCapitalize: 'off' };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Labelled label="App id">
        <input {...plain} className={BOX} value={appId} placeholder="Paste the app id" onChange={(e) => onAppId(e.target.value)} />
      </Labelled>
      <div className="flex flex-col gap-1">
        <label htmlFor={keyId} className="text-sm text-muted">App key</label>
        <div className="flex gap-2">
          <input
            {...plain}
            id={keyId}
            type={shown ? 'text' : 'password'}
            className={`${BOX} min-w-0 flex-1`}
            value={appKey}
            placeholder={keyEnd ? `Saved key ends ${keyEnd}` : 'Paste the key'}
            onChange={(e) => onAppKey(e.target.value)}
          />
          <button
            type="button"
            aria-pressed={shown}
            aria-controls={keyId}
            onClick={() => setShown(!shown)}
            className="shrink-0 rounded-lg border border-line px-3 text-sm text-ink transition hover:border-edge"
          >
            Show key
          </button>
        </div>
      </div>
    </div>
  );
}
