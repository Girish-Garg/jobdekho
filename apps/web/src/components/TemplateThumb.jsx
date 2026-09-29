// A thumbnail of a template's page, drawn as bars rather than rendered, so
// the difference between layouts reads at a glance without a PDF per
// template: Classic is centred and airy, Compact left-set and dense,
// Academic formal with a double rule, the Letter a sender block and
// paragraphs. Saffron marks the headings, as a person scans them.
const Bar = ({ x, y, w, h = 1.3, lead = false }) => (
  <rect x={x} y={y} width={w} height={h} rx={h / 2} className={lead ? 'fill-primary' : 'fill-ink/25'} />
);

const Lines = ({ from, count, gap = 2.4, widths = [30, 27, 29, 24] }) => (
  Array.from({ length: count }, (_, i) => <Bar key={i} x={4} y={from + i * gap} w={widths[i % widths.length]} h={1} />)
);

const PAGES = {
  classic: (
    <>
      <Bar x={11} y={4.5} w={18} h={2.4} lead />
      <Bar x={13} y={8.6} w={14} h={0.9} />
      {[13.5, 27, 39].map((y) => <Bar key={y} x={4} y={y} w={11} h={1.5} lead />)}
      <Lines from={17} count={3} gap={2.6} />
      <Lines from={30.5} count={3} gap={2.6} />
      <Lines from={42.5} count={2} gap={2.6} />
    </>
  ),
  compact: (
    <>
      <Bar x={4} y={4} w={15} h={2.2} lead />
      <Bar x={24} y={4.6} w={12} h={0.9} />
      {[9.5, 25, 38].map((y) => <Bar key={y} x={4} y={y} w={9} h={1.3} lead />)}
      <Lines from={12.5} count={6} gap={2} />
      <Lines from={28} count={5} gap={2} />
      <Lines from={41} count={4} gap={2} />
    </>
  ),
  academic: (
    <>
      <Bar x={10} y={4.5} w={20} h={2.2} lead />
      <rect x={4} y={9.5} width={32} height={0.4} className="fill-ink/40" />
      <rect x={4} y={10.5} width={32} height={0.4} className="fill-ink/40" />
      {[14, 28.5].map((y) => <Bar key={y} x={14} y={y} w={12} h={1.3} lead />)}
      <Lines from={18} count={4} gap={2.4} />
      <Lines from={32.5} count={6} gap={2.4} />
    </>
  ),
  letter: (
    <>
      <Bar x={22} y={4.5} w={14} h={1.8} lead />
      <Bar x={26} y={7.6} w={10} h={0.9} />
      <Bar x={4} y={12.5} w={9} h={0.9} />
      <Bar x={4} y={17} w={13} h={1.2} />
      <Lines from={21} count={4} gap={2.3} widths={[31, 30, 32, 20]} />
      <Lines from={32} count={3} gap={2.3} widths={[31, 29, 22]} />
      <Bar x={4} y={43} w={10} h={1.2} />
    </>
  ),
};

export default function TemplateThumb({ id }) {
  return (
    <span aria-hidden="true" className="grid h-[58px] w-[46px] shrink-0 place-items-center rounded-md border border-line bg-panel shadow-raise">
      <svg viewBox="0 0 40 52" width="40" height="52">{PAGES[id] ?? PAGES.classic}</svg>
    </span>
  );
}
