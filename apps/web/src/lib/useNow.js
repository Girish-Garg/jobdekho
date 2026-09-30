import { useEffect, useState } from 'react';

// The clock, ticking every `ms` while `running`. The waiting card's timer
// used to move only when the server's five-second heartbeat arrived, so it
// jumped 30s, 35s, 40s and read as stuck in between; it counts on its own
// now, from when the call started, and the heartbeat only says it is alive.
export function useNow(running = true, ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [running, ms]);
  return now;
}
