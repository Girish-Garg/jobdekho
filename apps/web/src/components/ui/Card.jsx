import { forwardRef } from 'react';

// Every bordered surface, so a card's corner, padding or ground is changed
// once in surfaces.css. variant: panel (a section of a page), inset (a well
// inside a panel), pop (floats over the page), list (rows edge to edge) or
// rail (the sticky index beside a long page). `as` keeps the element right
// for what the card is (a section, an aside, a form), and className still
// wins over the variant for the odd card that needs more room.
const Card = forwardRef(function Card({ as: Tag = 'div', variant = 'panel', className = '', ...props }, ref) {
  return <Tag ref={ref} className={`card card-${variant} ${className}`.trim()} {...props} />;
});

export default Card;
