import Svg from './IconSvg.jsx';

// The browser frame's icons in Apply assist (ApplyBrowserFrame.jsx): its
// back, reload and padlock, popping the window out, and the two halves of
// who has the wheel.
export function ArrowLeftIcon(props) {
  return <Svg {...props}><path d="M13 8H3M7 4L3 8l4 4" /></Svg>;
}

export function ReloadIcon(props) {
  return <Svg {...props}><path d="M13.5 3.5v3h-3" /><path d="M13 6.5A5.2 5.2 0 1 0 13.3 10" /></Svg>;
}

export function LockIcon(props) {
  return <Svg {...props}><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></Svg>;
}

export function PopOutIcon(props) {
  return <Svg {...props}><rect x="2" y="3" width="12" height="10" rx="1.5" /><rect x="8" y="8" width="4" height="3" rx="0.5" /></Svg>;
}

export function WindowIcon(props) {
  return <Svg {...props}><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M2 6h12" /></Svg>;
}

export function HandIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5.5 8V3.6a1 1 0 0 1 2 0V7.5M7.5 7V2.9a1 1 0 0 1 2 0V7.5M9.5 7.5V4a1 1 0 0 1 2 0v5c0 2.6-1.6 4.5-4.1 4.5-1.6 0-2.6-.7-3.5-2.1L2.7 9.3a1 1 0 0 1 1.7-1.1l1.1 1.4" />
    </Svg>
  );
}

export function CopyIcon(props) {
  return <Svg {...props}><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M10.5 3.5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v6.5a1 1 0 0 0 1 1h.5" /></Svg>;
}

export function PointerIcon(props) {
  return <Svg {...props}><path d="M3.5 2.5l9 4.2-3.9 1.3-1.3 3.9z" /><path d="M8.7 8.1l3.8 3.8" /></Svg>;
}
