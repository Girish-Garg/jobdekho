// A small rounded label for a property of something: Internship, New, a
// link's kind. tone is quiet (a plain fact), primary (worth noticing),
// applied (done) or line (on a hairline); the look lives in marks.css.
// `as` lets a chip that does something be a button and still look the part.
export default function Chip({ as: Tag = 'span', tone = 'quiet', className = '', ...props }) {
  return <Tag className={`chip chip-${tone} ${className}`.trim()} {...props} />;
}
