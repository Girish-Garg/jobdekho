import { CheckIcon } from './Icon.jsx';

const valueOf = (option) => option.value ?? option.label;

// The arrow keys move between options, as they do in Claude Code's list.
function onArrow(event) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  event.preventDefault();
  const all = [...event.currentTarget.querySelectorAll('[data-option]')];
  const at = all.indexOf(document.activeElement);
  all[(at + (event.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length]?.focus();
}

// One question's options as a list to press: numbered for a one-pick
// question, with a box to tick for a several-pick one. A description sits
// under its label in a quieter line.
export default function QuestionOptions({ question, picked, onChoose }) {
  return (
    <ul className="flex flex-col" onKeyDown={onArrow}>
      {question.options.map((option, i) => {
        const on = question.multiSelect && picked.includes(valueOf(option));
        return (
          <li key={`${i}:${option.label}`}>
            <button
              type="button"
              data-option
              aria-pressed={question.multiSelect ? on : undefined}
              onClick={() => onChoose(option)}
              className="flex w-full items-start gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors duration-fast ease hover:bg-select focus-visible:bg-select focus-visible:outline-none"
            >
              {question.multiSelect ? (
                <span aria-hidden="true" className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? 'border-primary bg-primary text-on-primary' : 'border-edge'}`}>
                  {on && <CheckIcon size={10} />}
                </span>
              ) : (
                <span aria-hidden="true" className="mt-0.5 w-4 shrink-0 font-mono text-xs text-muted">{i + 1}</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink">{option.label}</span>
                {option.description && <span className="block text-xs text-muted">{option.description}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
