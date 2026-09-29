import Svg from './IconSvg.jsx';

// The icons that label facts about a job (where, pay, experience, when) and
// the feed's own controls, kept apart from the interface icons in Icon.jsx
// so neither file outgrows the rest; Icon.jsx re-exports these, so every
// import still reads from one place.
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

export function SearchIcon(props) {
  return <Svg {...props}><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></Svg>;
}

export function RowsIcon(props) {
  return <Svg {...props}><path d="M2.5 4h11M2.5 8h11M2.5 12h11" /></Svg>;
}

export function CardsIcon(props) {
  return <Svg {...props}><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="9" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="2.5" y="9" width="4.5" height="4.5" rx="1" /><rect x="9" y="9" width="4.5" height="4.5" rx="1" /></Svg>;
}

export function MailIcon(props) {
  return <Svg {...props}><rect x="2" y="3.5" width="12" height="9" rx="1.5" /><path d="M2.5 4.5L8 8.5l5.5-4" /></Svg>;
}

export function PhoneIcon(props) {
  return <Svg {...props}><path d="M5.5 2.5l1.5 3-1.3 1.2a7 7 0 0 0 3.6 3.6L10.5 9l3 1.5v2a1 1 0 0 1-1.1 1A10.5 10.5 0 0 1 2.5 3.6a1 1 0 0 1 1-1.1z" /></Svg>;
}

export function LinkIcon(props) {
  return <Svg {...props}><path d="M6.5 9.5a2.5 2.5 0 0 0 3.5 0l2-2a2.5 2.5 0 0 0-3.5-3.5l-.5.5M9.5 6.5a2.5 2.5 0 0 0-3.5 0l-2 2a2.5 2.5 0 0 0 3.5 3.5l.5-.5" /></Svg>;
}

export function FolderIcon(props) {
  return <Svg {...props}><path d="M2 4.5a1 1 0 0 1 1-1h3.2l1.3 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" /></Svg>;
}

export function TrophyIcon(props) {
  return <Svg {...props}><path d="M5 2.5h6v3.5a3 3 0 0 1-6 0zM5 3.5H3v1a2 2 0 0 0 2 2M11 3.5h2v1a2 2 0 0 1-2 2M8 9v2.5M5.5 13.5h5M6.5 11.5h3" /></Svg>;
}

export function TagIcon(props) {
  return <Svg {...props}><path d="M2.5 2.5h5l6 6-5 5-6-6z" /><circle cx="5.5" cy="5.5" r="1" /></Svg>;
}

export function TargetIcon(props) {
  return <Svg {...props}><circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="3.2" /><circle cx="8" cy="8" r="0.6" /></Svg>;
}
