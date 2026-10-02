// The small capitals over a card or a group that say what kind of thing it
// is ("Made by AI", "Sources"). primary lights it saffron for something
// still waiting on the person. The look lives in marks.css; `as` keeps the
// element right where the eyebrow is a heading or a legend.
export default function Eyebrow({ as: Tag = 'p', primary = false, className = '', ...props }) {
  return <Tag className={`eyebrow${primary ? ' text-primary' : ''} ${className}`.trim()} {...props} />;
}
