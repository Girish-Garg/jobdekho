import Chip from './ui/Chip.jsx';
import { CheckIcon } from './Icon.jsx';

// The questions of one ask as short headers, the way Claude Code lists
// them: the one being answered lit, the ones answered ticked, any of them
// a click away to change before the last answer sends them all.
export default function QuestionTabs({ questions, at, answered, onPick }) {
  return (
    <div className="flex flex-wrap gap-1">
      {questions.map((question, i) => (
        <Chip
          key={`${i}:${question.header}`}
          as="button"
          type="button"
          tone={i === at ? 'primary' : 'quiet'}
          aria-current={i === at ? 'step' : undefined}
          onClick={() => onPick(i)}
          className="gap-1"
        >
          {answered(i) && i !== at && <CheckIcon size={10} />}
          {question.header}
        </Chip>
      ))}
    </div>
  );
}
