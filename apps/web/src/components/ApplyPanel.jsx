import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApplySession } from '../lib/useApplySession.js';
import { useApplyChat } from '../lib/useApplyChat.js';
import { useSignInWindow } from '../lib/useSignInWindow.js';
import { notifyError } from '../lib/toast.js';
import { fillApply, takeOverApply, showApplyWindow } from '../api/apply.js';
import ApplyHeader from './ApplyHeader.jsx';
import ApplyBrowserFrame from './ApplyBrowserFrame.jsx';
import ApplyAssistant from './ApplyAssistant.jsx';
import ApplyOpening from './ApplyOpening.jsx';
import ApplySignInWait from './ApplySignInWait.jsx';

// Apply assist: the application open in a browser of its own, drawn here in a
// browser frame (ApplyBrowserFrame.jsx), filled from the profile and handed to
// the person to review and submit, with the assistant beside it
// (ApplyAssistant.jsx): what happened, what needs them, and the AI to ask.
// Over the whole app, since the form needs the room; Escape is kept inside,
// where it belongs to the page, so it never closes the posting behind. A
// sign-in Google refuses in a driven browser goes through a normal window
// instead (lib/useSignInWindow.js), and the frame waits for it meanwhile.
export default function ApplyPanel({ posting, onClose, onApplied }) {
  const apply = useApplySession(posting);
  const chat = useApplyChat(apply.view?.id);
  const signIn = useSignInWindow(apply);
  const [hover, setHover] = useState(null);
  const [copying, setCopying] = useState(false);
  const view = apply.view;
  const act = (call) => () => apply.sessionId() && call(apply.sessionId()).catch(() => {});
  const close = async () => {
    await apply.close();
    onClose();
  };
  const ownBrowser = () => {
    window.open(view?.url || posting.url, '_blank', 'noopener');
    setCopying(true);
  };
  const actions = {
    takeover: act(takeOverApply),
    fill: act(fillApply),
    applied: () => onApplied?.(posting.id),
    close,
    window: () => signIn.start().catch((err) => notifyError(err, 'Could not open a normal window')),
  };
  const popOut = (shown) => apply.sessionId() && showApplyWindow(apply.sessionId(), shown).catch(() => {});

  let main;
  if (signIn.waiting) main = <ApplySignInWait url={signIn.waiting.url} onContinue={signIn.resume} onClose={close} />;
  else if (apply.status !== 'open' || !view) main = <ApplyOpening apply={apply} posting={posting} onClose={close} onOwnBrowser={ownBrowser} />;
  else main = <ApplyBrowserFrame apply={apply} view={view} hover={hover} onAction={(id) => actions[id]?.()} onPopOut={popOut} onOwnBrowser={ownBrowser} />;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-ink/50 p-2 sm:p-4" onKeyDown={(event) => event.stopPropagation()}>
      <div role="dialog" aria-modal="true" aria-label={`Apply assist: ${posting.title} at ${posting.company}`} className="pop-in mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-pop">
        <ApplyHeader posting={posting} copying={copying} onCopy={() => setCopying((on) => !on)} onClose={close} />
        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
          <div className="flex min-h-0 flex-col p-3 sm:p-4 lg:overflow-y-auto">{main}</div>
          <ApplyAssistant
            view={signIn.waiting ? null : view}
            chat={chat}
            onHover={setHover}
            onTakeOver={actions.takeover}
            copy={{ open: copying, close: () => setCopying(false), postingId: posting.id }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
