// A link that leaves JobDekho, dressed and lit like a .btn (buttons.css,
// dither.css). Chromium never runs a paint worklet on a link or on anything
// inside one, since a worklet could learn whether the link was visited, so
// the dithered surface is a span around the link and the link sits clear on
// top of it. It stays a real link: middle-click, copy address and the status
// bar all behave. `tone` is the button weight; `className` sizes the link.
export default function LinkButton({ href, tone = 'primary', className = '', children }) {
  return (
    <span className={`btn btn-${tone} p-0`}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 ${className}`}
      >
        {children}
      </a>
    </span>
  );
}
