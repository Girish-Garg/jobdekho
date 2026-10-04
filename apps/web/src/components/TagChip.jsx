import { useId, useState } from 'react';
import Chip from './ui/Chip.jsx';

// A chip, or any short value, that says why it is there on hover and on
// focus: the evidence the server stored with the tag ("Title says Senior",
// "Asks for 3 to 5 years"). A title attribute alone would leave keyboard and
// screen-reader users out, so the value can take focus, the tip is its
// accessible description, and Escape puts the tip away without also closing
// the pane behind it. The look lives in marks.css (.tip).
//
// `evidence` is a line or a list of them; with none, the value is drawn as
// it always was. `as` is what the value is drawn with (a Chip unless told
// otherwise) and `align` the edge the tip lines up with, the end for a row's
// right-hand cells so the tip opens inwards. `hostClassName` sizes the box
// around the value and its tip in the line it sits in: a chip never
// squeezes, while a pay figure shrinks to an ellipsis.
export default function TagChip({
  evidence, align = 'start', as: Tag = Chip, hostClassName = 'shrink-0', className = '', children, ...props
}) {
  const id = useId();
  const [hidden, setHidden] = useState(false);
  const lines = [].concat(evidence || []).filter(Boolean);
  if (!lines.length) return <Tag className={className} {...props}>{children}</Tag>;

  function onKeyDown(event) {
    if (event.key !== 'Escape' || hidden) return;
    event.stopPropagation();
    setHidden(true);
  }

  return (
    <span className={`tip-host ${hostClassName}`} onMouseLeave={() => setHidden(false)} onBlur={() => setHidden(false)}>
      <Tag tabIndex={0} aria-describedby={id} onKeyDown={onKeyDown} className={className} {...props}>
        {children}
      </Tag>
      <span role="tooltip" id={id} className={`tip ${align === 'end' ? 'right-0' : 'left-0'} ${hidden ? 'hidden' : ''}`}>
        {lines.map((line) => <span key={line} className="block">{line}</span>)}
      </span>
    </span>
  );
}
