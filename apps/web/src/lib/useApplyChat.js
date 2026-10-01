import { useState } from 'react';
import { askApply, stopApplyAsk } from '../api/apply.js';

// The conversation with the AI beside one application (see the server's
// apply/ask-run.js): what was said, kept while the panel is open, and the
// message being answered, its words as they are written.
//
//   messages  [{ role: 'you' | 'ai' | 'note' | 'error', text, filled? }]
//   pending   { text, provider, startedAt } while a message is answered
export function useApplyChat(sessionId) {
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(null);
  const add = (message) => setMessages((now) => [...now, message]);

  // More of the answer, or all of it anew once another CLI took over.
  const onEvent = (event) => setPending((now) => now && {
    ...now,
    provider: event.event === 'start' ? event.provider : now.provider,
    text: event.event === 'text' ? event.text ?? `${now.text}${event.add ?? ''}` : event.event === 'start' ? '' : now.text,
  });

  async function ask(text) {
    if (!sessionId || pending) return;
    add({ role: 'you', text });
    setPending({ text: '', provider: '', startedAt: Date.now() });
    try {
      const out = await askApply(sessionId, text, onEvent);
      add({ role: 'ai', text: out.reply, filled: out.filled ?? [] });
    } catch (err) {
      add(err.kind === 'stopped' ? { role: 'note', text: 'You stopped it.' } : { role: 'error', text: err.message });
    } finally {
      setPending(null);
    }
  }

  return { messages, pending, ask, stop: () => stopApplyAsk(sessionId).catch(() => {}) };
}
