import { forwardRef } from 'react';

// The many-line text box, in the same look as TextInput (fields.css), so a
// form that mixes the two reads as one form.
const TextArea = forwardRef(function TextArea({ className = '', ...props }, ref) {
  return <textarea ref={ref} className={`field ${className}`.trim()} {...props} />;
});

export default TextArea;
