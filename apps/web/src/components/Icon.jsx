// The app's few icons, drawn as inline SVG so they take the text colour they
// sit in (currentColor) and re-theme with it, and so a screen reader never
// reads a letter pretending to be a shape. Decorative by default: the control
// around an icon carries the name.
function Svg({ size = 14, className = '', children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export function ChevronDownIcon(props) {
  return <Svg {...props}><path d="M4 6l4 4 4-4" /></Svg>;
}

export function ChevronUpIcon(props) {
  return <Svg {...props}><path d="M4 10l4-4 4 4" /></Svg>;
}

export function CloseIcon(props) {
  return <Svg {...props}><path d="M4 4l8 8M12 4l-8 8" /></Svg>;
}

export function ArrowRightIcon(props) {
  return <Svg {...props}><path d="M3 8h10M9 4l4 4-4 4" /></Svg>;
}

export function CheckIcon(props) {
  return <Svg {...props}><path d="M3.5 8.5l3 3 6-7" /></Svg>;
}

export function ChevronRightIcon(props) {
  return <Svg {...props}><path d="M6 4l4 4-4 4" /></Svg>;
}

export function ArrowUpIcon(props) {
  return <Svg {...props}><path d="M8 13V3M4 7l4-4 4 4" /></Svg>;
}

export function ArrowDownIcon(props) {
  return <Svg {...props}><path d="M8 3v10M4 9l4 4 4-4" /></Svg>;
}

export function PlusIcon(props) {
  return <Svg {...props}><path d="M8 3v10M3 8h10" /></Svg>;
}

export function ExternalLinkIcon(props) {
  return <Svg {...props}><path d="M9.5 3H13v3.5M13 3L7.5 8.5M11.5 9.5V13H3V4.5h3.5" /></Svg>;
}
