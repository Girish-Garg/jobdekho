import Svg from './IconSvg.jsx';

// A note with its corner folded: what the chat remembers, on its chips and
// on the Profile page. Not the bookmark, which already means a saved job.
export function NoteIcon(props) {
  return <Svg {...props}><path d="M3 2.5h10V9l-4.5 4.5H3zM13 9H8.5v4.5M5.5 5.5h5M5.5 8h3" /></Svg>;
}
