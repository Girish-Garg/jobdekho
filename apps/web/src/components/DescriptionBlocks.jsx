// Draws the blocks lib/descriptionBlocks.js reads out of a stored body. Type
// stays on the body step and the headings are small: this is the employer's
// text, read for minutes, and the pane's own labels must still outrank it.

function Lead({ lead, text }) {
  return (
    <>
      {lead && <span className="font-medium text-ink">{lead} </span>}
      {text}
    </>
  );
}

function List({ block }) {
  const Tag = block.ordered ? 'ol' : 'ul';
  return (
    <Tag
      start={block.ordered ? block.items[0].number : undefined}
      className={`space-y-1.5 pl-5 marker:text-muted ${block.ordered ? 'list-decimal' : 'list-disc'}`}
    >
      {block.items.map((item, i) => (
        <li key={i} className="pl-1">
          {/* A number the list does not count for (a mixed list) stays in the text. */}
          {!block.ordered && item.number !== null && `${item.number}. `}
          <Lead lead={item.lead} text={item.text} />
        </li>
      ))}
    </Tag>
  );
}

export default function DescriptionBlocks({ blocks }) {
  return (
    <div className="max-w-[68ch] space-y-3 text-base leading-relaxed text-ink/85">
      {blocks.map((block, i) => {
        if (block.kind === 'heading') {
          return (
            <h4 key={i} className="pt-2 text-sm font-semibold tracking-tight text-ink first:pt-0">
              {block.text}
            </h4>
          );
        }
        if (block.kind === 'list') return <List key={i} block={block} />;
        return <p key={i}><Lead lead={block.lead} text={block.text} /></p>;
      })}
    </div>
  );
}
