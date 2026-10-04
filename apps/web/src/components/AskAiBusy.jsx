import { busyDoing, chatPlace } from '../lib/chatNames.js';
import ChatSignal from './ChatSignal.jsx';

// What the job pane's AI card says while an AI call runs. One runs at a
// time across every chat, so the card's buttons wait; with only a tooltip
// to say so, the card looked the same busy or not, and a press that did
// nothing read as broken. This says it outright, with the chat's own
// turning ring: what runs, where, and a way to go and watch it. A call
// about this very job is named as that.
export default function AskAiBusy({ busy, view, mine, onOpen }) {
  return (
    <p role="status" className="mt-3 flex items-start gap-2 rounded-lg bg-select px-3 py-2 text-xs leading-relaxed text-muted">
      <ChatSignal mark="busy" label="AI call running" />
      {mine ? (
        <span>
          {busyDoing(busy)} on this job.{' '}
          <button type="button" onClick={onOpen} className="link text-xs">Watch it</button>
        </span>
      ) : (
        <span>
          {busyDoing(busy)} in{' '}
          <button type="button" onClick={onOpen} className="link text-xs">{chatPlace(view, busy.title)}</button>
          . These wait until it's done.
        </span>
      )}
    </p>
  );
}
