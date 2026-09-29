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

export function SparkleIcon(props) {
  return <Svg {...props}><path fill="currentColor" strokeWidth="1" d="M7 2.5c.5 3.1 1.9 4.5 5 5-3.1.5-4.5 1.9-5 5-.5-3.1-1.9-4.5-5-5 3.1-.5 4.5-1.9 5-5zM12.5 1.5c.2 1 .5 1.3 1.5 1.5-1 .2-1.3.5-1.5 1.5-.2-1-.5-1.3-1.5-1.5 1-.2 1.3-.5 1.5-1.5z" /></Svg>;
}

export function GlobeIcon(props) {
  return <Svg {...props}><circle cx="8" cy="8" r="5.5" /><path d="M2.5 8h11M8 2.5c-1.7 1.6-2.5 3.4-2.5 5.5s.8 3.9 2.5 5.5M8 2.5c1.7 1.6 2.5 3.4 2.5 5.5s-.8 3.9-2.5 5.5" /></Svg>;
}

export function PinIcon(props) {
  return <Svg {...props}><path d="M5.5 2.5h5M6.5 2.5v3.3L4.5 8.5h7L9.5 5.8V2.5M8 8.5v5" /></Svg>;
}

export function PinOffIcon(props) {
  return <Svg {...props}><path d="M5.5 2.5h5M9.5 2.5v3.3l2 2.7H8.8M6.5 4.5v1.3L4.5 8.5h3M8 8.5v5M2.5 2.5l11 11" /></Svg>;
}

export function WarningIcon(props) {
  return <Svg {...props}><path d="M8 2.5l5.8 10H2.2zM8 6.5v2.5M8 11v.01" /></Svg>;
}

export function ShieldCheckIcon(props) {
  return <Svg {...props}><path d="M8 2l4.5 1.8v3.7c0 2.9-1.9 5-4.5 6.5-2.6-1.5-4.5-3.6-4.5-6.5V3.8zM6 8l1.5 1.5 2.5-3" /></Svg>;
}

export function PenIcon(props) {
  return <Svg {...props}><path d="M10.5 2.5l3 3-7.5 7.5H3v-3zM9 4l3 3" /></Svg>;
}

export function DocumentIcon(props) {
  return <Svg {...props}><path d="M4 2.5h5l3 3v8H4zM9 2.5v3h3M6 8.5h4M6 11h4" /></Svg>;
}

export function MapPinIcon(props) {
  return <Svg {...props}><path d="M8 14s4.5-4.2 4.5-7.5a4.5 4.5 0 0 0-9 0C3.5 9.8 8 14 8 14z" /><circle cx="8" cy="6.5" r="1.6" /></Svg>;
}

export function WalletIcon(props) {
  return <Svg {...props}><rect x="2" y="4.5" width="12" height="8.5" rx="1.5" /><path d="M4 4.5l6-2 .8 2M10.5 9h1.5" /></Svg>;
}

export function BriefcaseIcon(props) {
  return <Svg {...props}><rect x="2" y="5" width="12" height="8" rx="1.5" /><path d="M6 5V3.8a.8.8 0 0 1 .8-.8h2.4a.8.8 0 0 1 .8.8V5M2 8.5h12" /></Svg>;
}

export function GraduationCapIcon(props) {
  return <Svg {...props}><path d="M1.5 6.5L8 3.5l6.5 3L8 9.5zM4.5 8v3c0 .8 1.6 1.8 3.5 1.8s3.5-1 3.5-1.8V8M14.5 6.5V10" /></Svg>;
}

export function ClockIcon(props) {
  return <Svg {...props}><circle cx="8" cy="8" r="6" /><path d="M8 4.8V8l2.2 1.4" /></Svg>;
}

export function CalendarIcon(props) {
  return <Svg {...props}><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" /></Svg>;
}

export function BookmarkIcon(props) {
  return <Svg {...props}><path d="M4.5 2.5h7v11L8 11l-3.5 2.5z" /></Svg>;
}

export function BuildingIcon(props) {
  return <Svg {...props}><path d="M3 13.5v-10h6v10M9 6.5h4v7M1.5 13.5h13M5 5.5h2M5 8h2M5 10.5h2" /></Svg>;
}
