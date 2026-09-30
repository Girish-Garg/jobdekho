// The live view's socket. The session's token goes first, as a message and
// never in the address; then pictures come down (a small JSON header, then
// the JPEG itself as binary) and the person's input goes up, in order. A
// dropped connection (a sleeping laptop, a server restart) is retried with a
// growing pause; a refused token or a session that is gone is not.
const RETRY_MS = [500, 1000, 2000, 5000];
const FINAL = new Set([4001, 4004]);

function parse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function connectApply({ url, token, onView, onFrame, onClosed, Socket = WebSocket }) {
  let socket = null;
  let stopped = false;
  let tries = 0;
  let header = null;
  let timer = null;

  function receive(event) {
    if (typeof event.data !== 'string') {
      if (header) onFrame(header, event.data);
      header = null;
      return;
    }
    const msg = parse(event.data);
    if (msg?.t === 'frame') header = msg;
    else if (msg?.t === 'view') onView(msg.view);
    else if (msg?.t === 'closed') {
      stopped = true;
      onClosed?.();
    }
  }

  function open() {
    socket = new Socket(url);
    socket.binaryType = 'blob';
    socket.onopen = () => {
      tries = 0;
      socket.send(JSON.stringify({ t: 'hello', token }));
    };
    socket.onmessage = receive;
    socket.onclose = (event) => {
      if (stopped) return;
      if (FINAL.has(event.code)) {
        stopped = true;
        onClosed?.(event.code);
        return;
      }
      timer = setTimeout(open, RETRY_MS[Math.min(tries, RETRY_MS.length - 1)]);
      tries += 1;
    };
  }

  open();
  return {
    send(msg) {
      if (socket?.readyState === 1) socket.send(JSON.stringify(msg));
    },
    close() {
      stopped = true;
      clearTimeout(timer);
      socket?.close();
    },
  };
}
