import { useEffect, useState } from 'react';
import { startChatDraft } from './chatDraftSignal.js';

// What the box and the conversation need beyond sending (see
// ChatPanelBody.jsx): a question written while an answer is on its way,
// held (`queued`) and sent once that answer is in; Stop, for a question,
// one asked before a reload too, since a quick action has no stop on the
// server; and what a question that got no answer offers (ChatMissed.jsx):
// ask it again the way it was asked, or put it back in the box to change.
export function useChatQueue({ chat, runner, cli, onSend }) {
  const [queued, setQueued] = useState(null);

  useEffect(() => {
    if (runner.busy || !queued) return;
    setQueued(null);
    onSend(queued);
  }, [runner.busy, queued]); // eslint-disable-line react-hooks/exhaustive-deps

  const stoppable = Boolean(runner.call?.what.ask || runner.call?.remote);
  const missed = chat.missed ? {
    missed: chat.missed,
    onAgain: () => chat.ask(chat.missed.question, chat.missed.screen),
    onEdit: () => { chat.forget(); startChatDraft(chat.missed.question); },
    onRecheck: cli.refresh,
    checking: cli.checking,
  } : {};
  const box = { queued, onQueue: setQueued, onUnqueue: () => setQueued(null), onStop: stoppable ? chat.stop : null };
  return { box, missed };
}
