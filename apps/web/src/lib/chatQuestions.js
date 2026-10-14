// The questions a chat's AI asked back with its answer (see the server's
// chat/questions.js), as an ask for the dock above the box (see
// questionDock.js and components/ChatDock.jsx). They are answered by the
// person's next message, so only the newest answer's count, and none once
// the person has answered them or waved them away.
const done = new Set();

export function lastAsk(turns = []) {
  const last = turns.at(-1);
  if (!last?.questions?.length || done.has(last.id)) return null;
  return { id: `turn:${last.id}`, turnId: last.id, title: 'The AI asks', questions: last.questions };
}

export function setAside(turnId) {
  done.add(turnId);
}

// The picks as the person's next message: each question with what they
// picked, so it reads on its own in the chat and in what the model sees.
export function answerText(questions, picks) {
  return questions.map((question, i) => `${question.question} ${(picks[i] ?? []).join(', ') || 'None of these'}`).join('\n');
}
