import { useEffect, useRef, useState } from 'react';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import Eyebrow from './ui/Eyebrow.jsx';
import IconButton from './ui/IconButton.jsx';
import QuestionOptions from './QuestionOptions.jsx';
import QuestionTabs from './QuestionTabs.jsx';
import { CloseIcon } from './Icon.jsx';

const valueOf = (option) => option.value ?? option.label;

// A few questions asked above the chat's box, the way Claude Code asks: one
// at a time, with options to press (or a number key), so the person is
// never handed a wall of choices at once. Any part of the app can ask
// through it (lib/questionDock.js), and so can the chat's AI (see
// lib/chatQuestions.js). Pressing an option answers a one-pick question and
// moves on; a several-pick one is ticked, then sent with its button. The
// last answer sends them all. Escape, or the cross, stops asking.
//
// `ask` is { id, title, step?, questions }; `onSubmit` gets one list of
// picked values per question. `onOther` offers typing an answer instead.
// `held` is why nothing can be sent right now, when something is running.
export default function QuestionDock({ ask, onSubmit, onStop, onOther = null, held = null }) {
  const { questions } = ask;
  const [at, setAt] = useState(0);
  const [picks, setPicks] = useState(() => questions.map((q) => q.defaults ?? []));
  // The picks as of the last click, ahead of the redraw: two clicks before
  // one would otherwise each start from the picks the screen last drew.
  const latest = useRef(picks);
  const frame = useRef(null);
  const question = questions[at];

  useEffect(() => {
    frame.current?.querySelector('[data-option]')?.focus();
  }, [at]);

  const keep = (next) => {
    latest.current = next;
    setPicks(next);
  };

  function answer(list) {
    const next = latest.current.map((one, i) => (i === at ? list : one));
    keep(next);
    if (at < questions.length - 1) setAt(at + 1);
    else if (!held) onSubmit(next);
  }

  function choose(option) {
    const value = valueOf(option);
    if (!question.multiSelect) return answer([value]);
    const mine = latest.current[at];
    keep(latest.current.map((one, i) => (i === at ? (mine.includes(value) ? mine.filter((v) => v !== value) : [...mine, value]) : one)));
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onStop();
    }
    const n = Number(event.key);
    if (Number.isInteger(n) && n >= 1 && n <= question.options.length && !event.target.matches?.('textarea, input')) {
      event.preventDefault();
      choose(question.options[n - 1]);
    }
  }

  return (
    <Card as="section" ref={frame} aria-label={ask.title || 'A question for you'} onKeyDown={onKeyDown} className="flex flex-col gap-2 bg-paper p-3 shadow-raise">
      <div className="flex items-center gap-2">
        <Eyebrow as="span" primary className="min-w-0 flex-1 truncate">{ask.title || 'A question for you'}</Eyebrow>
        {ask.step && <span className="font-mono text-xs text-muted">{ask.step.at} of {ask.step.of}</span>}
        <IconButton size="xs" label="Stop asking" title="Stop (Esc)" onClick={onStop}><CloseIcon size={11} /></IconButton>
      </div>
      {questions.length > 1 && <QuestionTabs questions={questions} at={at} answered={(i) => i < at} onPick={setAt} />}
      <div>
        <p className="text-sm font-semibold text-ink">{question.question}</p>
        {question.detail && <p className="whitespace-pre-line text-xs text-muted">{question.detail}</p>}
      </div>
      <QuestionOptions question={question} picked={picks[at]} onChoose={choose} />
      <div className="flex flex-wrap items-center gap-2">
        {question.multiSelect && (
          <Button size="sm" variant="primary" disabled={Boolean(held) && at === questions.length - 1} onClick={() => answer(latest.current[at])}>
            {question.submitLabel ?? 'Done'}
          </Button>
        )}
        {question.skipLabel && <Button size="sm" onClick={() => answer([])}>{question.skipLabel}</Button>}
        {onOther && <Button size="sm" variant="ghost" onClick={onOther}>Type something else</Button>}
        <span className="ml-auto text-xs text-muted">{held || 'Numbers pick, Esc stops'}</span>
      </div>
    </Card>
  );
}
