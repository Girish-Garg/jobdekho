import { useState } from 'react';
import { answerAsk, stopAsking, useAsk } from '../lib/questionDock.js';
import { answerText, lastAsk, setAside } from '../lib/chatQuestions.js';
import QuestionDock from './QuestionDock.jsx';

const WAIT = 'Waiting for the answer that is running';

// The questions waiting above one chat's box, from either of the two places
// that ask: the app itself (a tailoring gone through step by step, see
// lib/questionDock.js), which goes first, or the chat's AI, whose newest
// answer may ask back (lib/chatQuestions.js). The AI's are answered by
// sending the picks as the person's next message; "Type something else"
// hands the box over for an answer in their own words.
export default function ChatDock({ chatId, turns, box, onType }) {
  const asked = useAsk(chatId);
  const [, redraw] = useState(0);
  const ai = asked ? null : lastAsk(turns);

  if (asked) {
    return <QuestionDock key={asked.id} ask={asked} onSubmit={(picks) => answerAsk(chatId, asked.id, picks)} onStop={() => stopAsking(chatId)} />;
  }
  if (!ai) return null;

  const close = () => {
    setAside(ai.turnId);
    redraw((n) => n + 1);
  };
  return (
    <QuestionDock
      key={ai.id}
      ask={ai}
      held={box.held || box.busy ? WAIT : null}
      onSubmit={(picks) => {
        close();
        box.onSend(answerText(ai.questions, picks));
      }}
      onStop={close}
      onOther={() => {
        close();
        onType();
      }}
    />
  );
}
