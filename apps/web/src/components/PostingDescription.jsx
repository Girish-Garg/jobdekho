import DescriptionFacts from './DescriptionFacts.jsx';
import DescriptionSections from './DescriptionSections.jsx';
import DescriptionBody from './DescriptionBody.jsx';
import DescribeNote from './DescribeNote.jsx';
import CutDescriptionNote from './CutDescriptionNote.jsx';

const CAPTION = 'text-xs font-semibold text-muted';
const NOTE = 'mt-3 text-sm text-muted';

// The description area of the pane. The feed row carries only a 280
// character snippet, so that is the first paint; the posting whole replaces
// it once GET /api/postings/:id answers (`view` is lib/usePostingDetail.js's
// state, cached per posting, so reopening one is instant). A posting that
// came with no description has it fetched once, with a calm line while the
// board is asked (see DescribeNote.jsx).
//
// With the whole posting, the facts its text states come first, then the
// text: in its sections where the server found headings, else as the blocks
// read out of the text (DescriptionBody.jsx), so a posting with no heading
// reads as well as it can until its sentences can be sorted. The parent
// keys this on the posting id, so every fold starts closed again for each
// posting opened.
export default function PostingDescription({ posting, view, onOpenSettings }) {
  const { status, detail, refusal } = view;
  const snippet = posting.descriptionSnippet || '';
  const full = detail?.descriptionText || '';
  const sections = full && detail.sections?.length ? detail.sections : null;
  const pending = status === 'loading' || status === 'describing';
  const empty = !full && !snippet;
  if (empty && !pending && !refusal && !detail?.facts) return null;

  return (
    <section aria-labelledby="posting-description-title" aria-busy={pending}>
      <h3 id="posting-description-title" className={`${CAPTION} mb-2`}>About the job</h3>
      <DescriptionFacts facts={detail?.facts} />
      {sections ? <DescriptionSections sections={sections} /> : <DescriptionBody key={full ? 'full' : 'snippet'} text={full || snippet} full={Boolean(full)} />}
      <CutDescriptionNote posting={posting} text={full} />
      <DescribeNote status={status} refusal={refusal} placeholder={empty} onOpenSettings={onOpenSettings} />
      {status === 'failed' && <p className={NOTE}>The full description did not load, so this is the preview.</p>}
    </section>
  );
}
