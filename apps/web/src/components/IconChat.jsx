import Svg from './IconSvg.jsx';

// Two arrows passing each other: a comparison of jobs, on its chat's mark
// and on "Compare jobs".
export function CompareIcon(props) {
  return <Svg {...props}><path d="M3 5.5h9.5M10 3l2.5 2.5L10 8M13 10.5H3.5M6 8l-2.5 2.5L6 13" /></Svg>;
}

// A window with a column down its side: the chat docked beside the page.
// The pin is the chat's own (it keeps the chat on screen), so where the
// panel sits needs a picture of its own.
export function DockIcon(props) {
  return <Svg {...props}><rect x="2.5" y="3" width="11" height="10" rx="1.5" /><path d="M6.5 3v10" /></Svg>;
}
