import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';

// Stands in for the fill-in button once the profile already holds something,
// because there is no telling a hand-corrected field from an extracted one.
// "Keep my edits" is the way out, so the safe choice is also the named one.
// It lives in the resume card, as narrow as the rail it sits in, so the two
// choices stack at the card's width rather than squeezing onto one line; the
// go-ahead keeps the tint of the button that asked.
export default function OverwriteConfirm({ onConfirm, onCancel }) {
  return (
    <Card className="flex flex-col gap-3 rounded-lg p-4">
      <p className="text-sm text-ink">
        This replaces your skills, titles, locations, years and degree. Everything else is offered for review.
      </p>
      <div className="flex flex-col gap-2">
        <Button variant="tint" onClick={onConfirm} className="w-full py-2">
          Overwrite and fill in
        </Button>
        <Button onClick={onCancel} className="w-full py-2 font-normal">
          Keep my edits
        </Button>
      </div>
    </Card>
  );
}
