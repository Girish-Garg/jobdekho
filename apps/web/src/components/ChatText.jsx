import { Fragment } from 'react';
import { chatBlocks } from '../lib/chatText.js';

// An answer's text as paragraphs, lists and bold, built from React text
// nodes only (see lib/chatText.js): what a model wrote is never HTML here.
function Spans({ spans }) {
  return spans.map((span, i) => (span.bold
    ? <strong key={i} className="font-semibold text-ink">{span.text}</strong>
    : <Fragment key={i}>{span.text}</Fragment>));
}

const LIST = 'flex flex-col gap-1 pl-5 marker:text-muted';

export default function ChatText({ text, className = '' }) {
  return (
    <div className={`flex flex-col gap-2.5 break-words text-base leading-relaxed text-ink/90 ${className}`}>
      {chatBlocks(text).map((block, i) => {
        if (block.type === 'p') {
          return (
            <p key={i}>
              {block.lines.map((line, j) => <Fragment key={j}>{j > 0 && <br />}<Spans spans={line} /></Fragment>)}
            </p>
          );
        }
        const items = block.items.map((item, j) => <li key={j} className="pl-0.5"><Spans spans={item} /></li>);
        return block.type === 'ol'
          ? <ol key={i} start={block.start} className={`list-decimal ${LIST}`}>{items}</ol>
          : <ul key={i} className={`list-disc ${LIST}`}>{items}</ul>;
      })}
    </div>
  );
}
