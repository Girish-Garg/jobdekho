import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApplySession } from '../lib/useApplySession.js';
import { fillApply, takeOverApply, showApplyWindow } from '../api/apply.js';
import ApplyToolbar from './ApplyToolbar.jsx';
import ApplyBanner from './ApplyBanner.jsx';
import ApplyLiveView from './ApplyLiveView.jsx';
import ApplyChecklist from './ApplyChecklist.jsx';
import ApplyCopyPanel from './ApplyCopyPanel.jsx';
import ApplyOpening from './ApplyOpening.jsx';
import { ApplyChooser, ApplyPageDialog } from './ApplyPrompts.jsx';

// Apply assist: the application open in a browser of its own, streamed here,
// filled from the profile, and handed to the person to review and submit.
// Over the whole app, since the form needs the room; Escape is kept inside,
// where it belongs to the page, so it never closes the posting behind.
export default function ApplyPanel({ posting, onClose, onApplied }) {
  const apply = useApplySession(posting);
  const [tab, setTab] = useState('checklist');
  const [hover, setHover] = useState(null);
  const view = apply.view;
  const act = (call) => () => apply.sessionId() && call(apply.sessionId()).catch(() => {});
  const close = async () => {
    await apply.close();
    onClose();
  };
  const ownBrowser = () => {
    window.open(view?.url || posting.url, '_blank', 'noopener');
    setTab('copy');
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-ink/40 p-2 sm:p-4" onKeyDown={(event) => event.stopPropagation()}>
      <div role="dialog" aria-modal="true" aria-label={`Apply assist: ${posting.title} at ${posting.company}`} className="mx-auto flex h-full max-w-[1400px] flex-col gap-3 overflow-hidden rounded-xl border border-line bg-panel p-3 shadow-pop sm:p-4">
        {apply.status !== 'open' || !view ? (
          <ApplyOpening apply={apply} posting={posting} onClose={close} onOwnBrowser={ownBrowser} />
        ) : (
          <>
            <ApplyToolbar view={view} onTakeOver={act(takeOverApply)} onPopOut={(shown) => apply.sessionId() && showApplyWindow(apply.sessionId(), shown).catch(() => {})} onOwnBrowser={ownBrowser} onClose={close} />
            <ApplyBanner view={view} onFill={act(fillApply)} onApplied={() => onApplied?.(posting.id)} />
            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="relative min-h-0 overflow-y-auto">
                <ApplyLiveView apply={apply} view={view} hover={hover} />
                <div className="absolute inset-x-4 top-4 z-30 flex flex-col gap-2">
                  {view.chooser && <ApplyChooser files={view.files} onChoose={(choice) => apply.send({ t: 'chooser', choice })} />}
                  {view.dialog && <ApplyPageDialog dialog={view.dialog} onAnswer={(accept) => apply.send({ t: 'dialog', accept })} />}
                </div>
              </div>
              <aside className="flex min-h-0 flex-col gap-2 border-t border-line pt-2 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
                <div role="tablist" className="flex gap-1">
                  {[['checklist', 'On this page'], ['copy', 'Copy your details']].map(([id, word]) => (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`btn btn-sm ${tab === id ? 'btn-tint' : 'btn-ghost'}`}>
                      {word}
                    </button>
                  ))}
                </div>
                {tab === 'checklist'
                  ? <ApplyChecklist rows={view.rows} onHover={setHover} />
                  : <ApplyCopyPanel postingId={posting.id} sessionId={view.id} files={view.files} />}
              </aside>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
