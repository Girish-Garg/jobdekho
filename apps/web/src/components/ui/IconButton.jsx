import { forwardRef } from 'react';

// A button that is only an icon (close, remove, a row's tools). It has no
// words, so label is required: it is the name a screen reader reads, and
// without it the button is a blank to anyone not looking at it. size is xs,
// sm or md; tone="danger" turns it red for a removal; outline sets it on a
// hairline; square gives it the softer corner of the controls beside it.
// The look lives in controls.css.
const IconButton = forwardRef(function IconButton(
  { label, size = 'sm', tone, outline = false, square = false, type = 'button', className = '', ...props },
  ref,
) {
  const classes = [
    'icon-btn',
    `icon-btn-${size}`,
    tone === 'danger' && 'icon-btn-danger',
    outline && 'icon-btn-outline',
    square && 'icon-btn-square',
    className,
  ].filter(Boolean).join(' ');
  return <button ref={ref} type={type} aria-label={label} className={classes} {...props} />;
});

export default IconButton;
