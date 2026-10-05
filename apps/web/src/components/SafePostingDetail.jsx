import PostingDetail, { TITLE_ID } from './PostingDetail.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import BrokenPart from './BrokenPart.jsx';

// One posting, as the job pane and the job dialog draw it. The posting's own
// data is what most often breaks a drawing, so a posting that cannot be
// drawn says so in the pane, which keeps its way out, and the feed goes on.
// Opening another job draws that one afresh.
export default function SafePostingDetail(props) {
  const { posting, onClose } = props;
  const broken = ({ report, retry }) => (
    <BrokenPart
      titleId={TITLE_ID}
      title="This job could not be shown"
      body="Something in this posting broke the pane. Your feed and every other job still work."
      report={report}
      retry={retry}
      onClose={onClose}
    />
  );
  return (
    <ErrorBoundary where={`the posting ${posting?.id}`} resetKey={posting?.id} fallback={broken}>
      <PostingDetail {...props} />
    </ErrorBoundary>
  );
}
