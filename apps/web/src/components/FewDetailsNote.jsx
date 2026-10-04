import Card from './ui/Card.jsx';

// A posting whose own full text runs to under 60 words (the server's
// `fewDetails`). It is a fact about the text and never a warning, so it is
// grey like the stale note, not ember; missing pay never counts toward it.
export default function FewDetailsNote({ posting }) {
  if (!posting?.fewDetails) return null;
  return (
    <Card as="p" variant="inset" className="bg-select/50 py-2.5 text-sm text-muted">
      <span className="font-semibold text-ink/80">Few details.</span> The posting's own text runs to under 60 words.
    </Card>
  );
}
