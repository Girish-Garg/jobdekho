import { useState } from 'react';
import Card from './ui/Card.jsx';
import ApplyBrowserBar from './ApplyBrowserBar.jsx';
import ApplyLiveView from './ApplyLiveView.jsx';
import ApplyControlStrip from './ApplyControlStrip.jsx';
import { ApplyChooser, ApplyPageDialog } from './ApplyPrompts.jsx';

// The application in a browser frame: the tab and address bar on top
// (ApplyBrowserBar.jsx), the live page with the site's own file chooser and
// confirm drawn over it, and the bar that always says who has the wheel
// (ApplyControlStrip.jsx). Under it, how to type into the page and, on a job
// board, what the board's terms say about tools.
export default function ApplyBrowserFrame({ apply, view, hover, onAction, onPopOut, onOwnBrowser }) {
  const [typing, setTyping] = useState(false);
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <Card variant="list" className="border-edge bg-overlay">
        <ApplyBrowserBar view={view} onNav={(go) => apply.send({ t: 'nav', go })} onPopOut={onPopOut} onOwnBrowser={onOwnBrowser} />
        <div className="relative">
          <ApplyLiveView apply={apply} view={view} hover={hover} onTyping={setTyping} />
          <div className="absolute inset-x-4 top-4 z-30 flex flex-col gap-2">
            {view.chooser && <ApplyChooser files={view.files} onChoose={(choice) => apply.send({ t: 'chooser', choice })} />}
            {view.dialog && <ApplyPageDialog dialog={view.dialog} onAnswer={(accept) => apply.send({ t: 'dialog', accept })} />}
          </div>
        </div>
        <ApplyControlStrip view={view} onAction={onAction} />
      </Card>
      <p className="px-1 text-xs text-muted">
        {typing ? 'Typing goes to the form. Click outside it to stop.' : 'Click in the page to type into it, as in any browser. Any press takes control.'}
      </p>
      {view.board && <p className="px-1 text-xs text-muted">{view.board}</p>}
    </div>
  );
}
