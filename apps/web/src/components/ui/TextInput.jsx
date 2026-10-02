import { forwardRef } from 'react';

// A one-line text box, in the look every form in the app shares (fields.css).
// It passes everything else through, so it is still a plain <input> to the
// form around it, to a ref, and to a test that finds it by its label.
const TextInput = forwardRef(function TextInput({ className = '', ...props }, ref) {
  return <input ref={ref} className={`field ${className}`.trim()} {...props} />;
});

export default TextInput;
