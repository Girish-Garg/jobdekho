import GradeBand from './GradeBand.jsx';
import LevelDivider from './LevelDivider.jsx';

// What opens before one posting in the feed, worked out once for the page by
// lib/gradeBands.js's feedMarks: the "Level not stated" divider where that
// part begins, then the band of its grade. `as` is 'row' in the list and
// 'heading' in the card grid.
export default function FeedMarks({ posting, marks, as = 'row' }) {
  return (
    <>
      {posting.id === marks.divider && <LevelDivider count={marks.notStated ?? undefined} as={as} />}
      {marks.bands.has(posting.id) && <GradeBand grade={posting.grade} count={marks.counts?.[posting.grade]} as={as} />}
    </>
  );
}
