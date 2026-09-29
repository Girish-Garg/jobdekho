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
