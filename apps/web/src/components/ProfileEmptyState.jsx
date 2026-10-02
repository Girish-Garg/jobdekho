// The record is open the moment the page loads, so a first visit has no gate
// to click through; what it does need is a pointer to the quickest ways in,
// and word that typing it all by hand is just as good. Two short lines of
// text rather than a card, so the record stays what the page is about from
// the first screen. Each sentence has its own line: run together they
// wrapped to leave one word alone on the second.
export default function ProfileEmptyState() {
  return (
    <p className="max-w-2xl text-sm text-muted">
      <span className="block">The quickest start is to upload your resume or tell the chat about yourself.</span>
      <span className="block">Everything here can also be typed in directly.</span>
    </p>
  );
}
