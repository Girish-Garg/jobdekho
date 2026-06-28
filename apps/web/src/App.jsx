import { useEffect, useState } from 'react';
import { getMe } from './api.js';
import Login from './components/Login.jsx';
import Shell from './components/Shell.jsx';

export default function App() {
  const [state, setState] = useState({ status: 'loading', user: null });

  useEffect(() => {
    getMe()
      .then((user) => setState({ status: 'in', user }))
      .catch((err) => setState({ status: err.status === 401 ? 'out' : 'error', user: null }));
  }, []);

  if (state.status === 'loading') return <Splash label="Loading your board" />;
  if (state.status === 'error') return <Splash label="The server is unreachable. Try again shortly." />;
  const handleLogout = () => setState({ status: 'out', user: null });
  if (state.status === 'out') return <Login />;
  return <Shell user={state.user} onLogout={handleLogout} />;
}

function Splash({ label }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="font-mono text-sm text-muted">{label}</p>
    </div>
  );
}
