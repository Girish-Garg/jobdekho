import { useEffect, useState } from 'react';
import { getMail, connectMail, disconnectMail } from '../api.js';
import { noteMailAccount } from './mailAccount.js';

// Settings' Gmail card: the connection as the server describes it (`view`,
// undefined while loading and null when it could not be read), the two
// fields, what is under way (`busy`: 'connect', 'disconnect' or null) and
// the last outcome (`note`: { tone, text }).
//
// The password field is emptied the moment Connect answers, either way, so
// the app password sits in the page no longer than it takes to send it.
export function useMailAccount() {
  const [view, setView] = useState(undefined);
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState(null);

  useEffect(() => {
    getMail().then((next) => {
      setView(next);
      noteMailAccount(next);
    }, () => setView(null));
  }, []);

  async function act(kind, run) {
    setBusy(kind);
    setNote(null);
    try {
      setNote(await run());
    } catch (err) {
      setNote({ tone: 'error', text: err.message });
    }
    setPassword('');
    setBusy(null);
  }

  const connect = () => act('connect', async () => {
    const next = await connectMail({ address, password });
    setView(next);
    noteMailAccount(next);
    setAddress('');
    return { tone: 'ok', text: 'Connected. Mails you approve in the chat now go from this account.' };
  });

  const disconnect = () => act('disconnect', async () => {
    const next = await disconnectMail();
    setView(next);
    noteMailAccount(next);
    return { tone: 'muted', text: 'Disconnected. JobDekho no longer has the app password.' };
  });

  return { view, address, setAddress, password, setPassword, busy, note, connect, disconnect };
}

// Where the computer keeps the app password, as the card says it.
export const KEPT_IN = {
  windows: "Windows' protected storage",
  keychain: "your Mac's Keychain",
  'secret-service': 'your desktop keyring',
  file: 'a file only your account can read',
};
