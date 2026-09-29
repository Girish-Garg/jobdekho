// A stored body runs to 4000 characters, a few screens of the pane with the
// apply step waiting under it. Past FOLD_OVER characters it opens folded at
// about FOLD_AT, cut between blocks or list items, never inside a sentence.
export const FOLD_OVER = 1600;
export const FOLD_AT = 900;

const sizeOf = (block) => (block.kind === 'list'
  ? block.items.reduce((sum, item) => sum + item.lead.length + item.text.length, 0)
  : (block.lead?.length || 0) + block.text.length);

export function totalSize(blocks) {
  return blocks.reduce((sum, block) => sum + sizeOf(block), 0);
}

export function foldBlocks(blocks, budget = FOLD_AT) {
  const shown = [];
  let used = 0;
  for (const block of blocks) {
    if (used >= budget) break;
    if (block.kind !== 'list') {
      shown.push(block);
      used += sizeOf(block);
      continue;
    }
    const items = [];
    for (const item of block.items) {
      if (used >= budget && items.length) break;
      items.push(item);
      used += item.lead.length + item.text.length;
    }
    shown.push({ ...block, items });
  }
  // A heading with nothing under it reads as a mistake, so it waits.
  if (shown.length > 1 && shown.at(-1).kind === 'heading') shown.pop();
  return shown;
}
