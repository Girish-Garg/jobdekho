import { SparkleIcon } from './Icon.jsx';

const SIZES = {
  sm: { box: 'h-6 w-6', icon: 12 },
  md: { box: 'h-8 w-8', icon: 15 },
  lg: { box: 'h-12 w-12 ring-8 ring-primary/5', icon: 22 },
};

// The panel's mark for the AI: one sparkle in a saffron-tinted circle, the
// same in the header, beside every answer and in the empty state, so an
// answer is told from the person's own words at a glance without a label.
export default function ChatAvatar({ size = 'sm' }) {
  const { box, icon } = SIZES[size] ?? SIZES.sm;
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full bg-primary/10 text-primary ${box}`}>
      <SparkleIcon size={icon} />
    </span>
  );
}
