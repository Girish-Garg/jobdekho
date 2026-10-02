import { forwardRef } from 'react';

// Every button with words on it, so a change to how buttons look is a change
// to buttons.css and nowhere else. variant is the weight (primary, tint,
// quiet, ghost, danger); size="sm" is the dense one for rows and cards.
// className still wins over the variant (see buttons.css), so a full-width
// or roomier button says so here. type defaults to "button", because the
// browser's default of "submit" turns any button inside a form into a send.
// `as` dresses what cannot be a button in the same weight: the label that
// opens a file picker, a link that downloads a file.
const Button = forwardRef(function Button(
  { as: Tag = 'button', variant = 'quiet', size, type = 'button', className = '', ...props },
  ref,
) {
  const sized = size === 'sm' ? ' btn-sm' : '';
  const own = Tag === 'button' ? { type } : {};
  return <Tag ref={ref} {...own} className={`btn btn-${variant}${sized} ${className}`.trim()} {...props} />;
});

export default Button;
