import Svg from './IconSvg.jsx';

// The kinds of link a career record holds that no other icon already says
// (code, live, design, paper and a plain link borrow theirs, see
// LinkKindIcon.jsx), and the grip a line is dragged by. Kept apart from
// Icon.jsx, which re-exports them, so neither file outgrows the rest.
export function PlayIcon(props) {
  return <Svg {...props}><rect x="2" y="3.5" width="12" height="9" rx="2" /><path d="M6.8 6.1v3.8L10 8z" /></Svg>;
}

export function FigmaIcon(props) {
  return (
    <Svg {...props}>
      <path d="M8 2.5H6.25a1.75 1.75 0 0 0 0 3.5H8zM8 2.5h1.75a1.75 1.75 0 0 1 0 3.5H8zM8 6H6.25a1.75 1.75 0 0 0 0 3.5H8zM8 9.5H6.25a1.75 1.75 0 1 0 1.75 1.75z" />
      <circle cx="9.75" cy="7.75" r="1.75" />
    </Svg>
  );
}

export function DriveIcon(props) {
  return <Svg {...props}><path d="M2.5 9.5l2-5.5h7l2 5.5M2.5 9.5h11v3a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1zM11 11.5h.01" /></Svg>;
}

export function DatasetIcon(props) {
  return <Svg {...props}><ellipse cx="8" cy="4.25" rx="5" ry="1.75" /><path d="M3 4.25v7.5c0 1 2.2 1.75 5 1.75s5-.75 5-1.75v-7.5M3 8c0 1 2.2 1.75 5 1.75S13 9 13 8" /></Svg>;
}

export function ImageIcon(props) {
  return <Svg {...props}><rect x="2" y="3" width="12" height="10" rx="1.5" /><circle cx="5.75" cy="6.25" r="1.1" /><path d="M2.5 11.5L6 8l2.5 2.5 2-2 3 3" /></Svg>;
}

export function GripIcon(props) {
  return <Svg {...props}><path strokeWidth="2.2" d="M6 4h.01M10 4h.01M6 8h.01M10 8h.01M6 12h.01M10 12h.01" /></Svg>;
}
