// The app's few icons, drawn as inline SVG so they take the text colour they
// sit in (currentColor) and re-theme with it, and so a screen reader never
// reads a letter pretending to be a shape. Decorative by default: the control
// around an icon carries the name.
export default function Svg({ size = 14, className = '', children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}
