// Why a posting got its grade, laid out as the server judged it: the skills
// the person has, has something close to, and lacks; the years the ad asks;
// the place. A part that held the fit back carries its multiplier ("x0.3"),
// so the number above can be read back from the rows. Role and degree rows
// appear only when they cost something: most jobs are neither.
//
// Everything here is the server's (see core's fit-explain.js): the pane shows
// the judgement the ranking made, never one recomputed from the snippet.
const GATE_ROW = { level: 'Asks', place: 'Place', type: 'Role', degree: 'Degree' };

const skillList = (items) => items.map((i) => i.skill).join(', ');
const closeList = (items) => items.map((i) => `${i.skill} (you know ${i.via})`).join(', ');

function rows(why, gates) {
  const gate = Object.fromEntries((gates ?? []).map((g) => [g.gate, g]));
  const out = [];
  if (why.has?.length) out.push(['Has', skillList(why.has)]);
  if (why.close?.length) out.push(['Close', closeList(why.close)]);
  if (why.missing?.length) out.push(['Missing', skillList(why.missing)]);
  if (why.asked?.phrase) out.push([GATE_ROW.level, why.asked.phrase, gate.level?.value]);
  if (why.place) out.push([GATE_ROW.place, why.place, gate.place?.value]);
  for (const name of ['type', 'degree']) {
    if (gate[name]?.value < 1) out.push([GATE_ROW[name], gate[name].why, gate[name].value]);
  }
  return out;
}

const held = (value) => Number.isFinite(value) && value < 1;

export default function FitWhy({ why, gates }) {
  if (!why) return null;
  const lines = rows(why, gates);
  if (!lines.length) return null;

  return (
    <dl aria-label="Why this grade" className="mt-3 grid grid-cols-[4.5rem_1fr_auto] gap-x-3 gap-y-1.5 text-sm">
      {lines.map(([label, text, value]) => (
        <div key={label} className="contents">
          <dt className="text-xs leading-5 text-muted">{label}</dt>
          <dd className="text-ink/85">{text}</dd>
          <dd className="tnum text-right text-xs leading-5 text-muted" aria-label={held(value) ? `holds the fit to ${Math.round(value * 100)} percent` : undefined}>
            {held(value) ? `x${value}` : ''}
          </dd>
        </div>
      ))}
    </dl>
  );
}
