// The small capitals over a card or a group that say what kind of thing it
// is ("Made by AI", "Sources"). primary lights it saffron for something
// still waiting on the person; mono is the typewriter one used inside an
// AI's answer. The look lives in marks.css; `as` keeps the element right
// where the eyebrow is a heading, a legend or a run inside a sentence.
export default function Eyebrow({ as: Tag = 'p', primary = false, mono = false, className = '', ...props }) {
  const classes = ['eyebrow', mono && 'eyebrow-mono', primary && 'text-primary', className].filter(Boolean).join(' ');
  return <Tag className={classes} {...props} />;
}
