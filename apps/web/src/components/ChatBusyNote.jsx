import { busyDoing, chatPlace, WAIT_FOR_IT } from '../lib/chatNames.js';

// Why Send waits in this chat: one AI call runs at a time across every chat,
// and it is running in another one, named here with a way to go and watch
// it. Typing goes on meanwhile; the draft is kept.
export default function ChatBusyNote({ busy, view, cli, onOpen }) {
  return (
    <p role="status" className="px-1 text-xs leading-relaxed text-muted">
      {busyDoing(busy, cli)} in{' '}
      <button type="button" onClick={onOpen} className="link text-xs">{chatPlace(view, busy.title)}</button>
      . {WAIT_FOR_IT}
    </p>
  );
}
