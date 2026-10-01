import { ArrowLeftIcon, ArrowRightIcon, ExternalLinkIcon, LockIcon, PopOutIcon, ReloadIcon, WarningIcon } from './Icon.jsx';

// The top of the browser frame Apply assist draws around the live page, the
// way a browser looks, so it reads as one at a glance: the page's tab with a
// Live mark, then back, forward and reload (presses of the person's, which
// take the wheel like any other), the address with its padlock, and the two
// ways out of the frame: the very same window on screen, or the person's own
// browser.
function partsOf(url) {
  try {
    const u = new URL(url);
    return { host: u.host, rest: `${u.pathname}${u.search}`.replace(/^\/$/, ''), secure: u.protocol === 'https:' };
  } catch {
    return { host: '', rest: '', secure: false };
  }
}

function BarButton({ label, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition-colors duration-fast ease hover:bg-select hover:text-ink">
      {children}
    </button>
  );
}

export default function ApplyBrowserBar({ view, onNav, onPopOut, onOwnBrowser }) {
  const { host, rest, secure } = partsOf(view.url);
  return (
    <div>
      <div className="flex items-end gap-2 px-2 pt-2">
        <div className="flex h-8 min-w-0 max-w-[18rem] items-center gap-2 rounded-t-lg bg-panel px-3 text-xs">
          <span aria-hidden="true" className="grid h-4 w-4 shrink-0 place-items-center rounded-sm bg-select text-[9px] font-bold uppercase text-muted">{(view.title || host).charAt(0) || '·'}</span>
          <span className="truncate font-medium text-ink">{view.title || host || 'Opening...'}</span>
        </div>
        <span className="mb-1.5 ml-auto mr-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-applied/30 bg-applied/10 px-2 py-0.5 text-[10.5px] font-semibold text-applied">
          <span aria-hidden="true" className="breathe h-1.5 w-1.5 rounded-full bg-applied" />
          Live
        </span>
      </div>
      <div className="flex items-center gap-1 border-b border-line bg-panel px-2 py-1.5">
        <BarButton label="Back" onClick={() => onNav('back')}><ArrowLeftIcon size={13} /></BarButton>
        <BarButton label="Forward" onClick={() => onNav('forward')}><ArrowRightIcon size={13} /></BarButton>
        <BarButton label="Reload" onClick={() => onNav('reload')}><ReloadIcon size={13} /></BarButton>
        <div title={view.url} className="mx-1 flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full bg-select px-3 text-xs">
          <span className={secure ? 'text-muted' : 'text-ember'}>{secure ? <LockIcon size={12} /> : <WarningIcon size={12} />}</span>
          <span className="truncate">
            <span className="font-semibold text-ink">{host}</span>
            <span className="text-muted">{rest}</span>
          </span>
        </div>
        {view.canPopOut && (
          <BarButton label={view.shown ? 'Back into JobDekho' : 'Pop out'} onClick={() => onPopOut(!view.shown)}><PopOutIcon size={13} /></BarButton>
        )}
        <BarButton label="Open in my browser" onClick={onOwnBrowser}><ExternalLinkIcon size={13} /></BarButton>
      </div>
    </div>
  );
}
