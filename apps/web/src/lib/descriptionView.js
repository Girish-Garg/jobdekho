import { yearsLabel } from './tagEvidence.js';
import { payText } from './payText.js';
import { workModeLabel } from './taxonomy.js';

// How the pane reads the server's `sections` and `facts` (see the store's
// posting-lookup.js and core's jd-layout.js). The sections arrive in reading
// order; this only decides what shows, under which heading, and what folds.

// A section the server split off from its heading (the part of an "About
// us" that is not company template text, say) has none of its own. It
// carries on from a section of the same kind just above it; elsewhere it
// takes the plain name of what it holds, so it never reads as part of the
// section before it.
const KIND_HEADING = {
  duties: "What you'll do",
  requirements: 'What they want',
  nice: 'Nice to have',
  pay: 'Pay and perks',
  apply: 'How to apply',
  about: 'About the company',
};

// Lines that start "- " are list items, one list until a plain line ends it.
// A short line ending in a colon ("Stipend:") labels what follows it, where
// the server's heading list did not know the word, so it reads as a label
// rather than as a sentence of its own.
const LABEL = /^[^.!?]{1,40}:$/;

export function lineGroups(lines = []) {
  const groups = [];
  for (const line of lines) {
    const item = line.startsWith('- ');
    const last = groups.at(-1);
    if (item && last?.kind === 'list') last.items.push(line.slice(2));
    else if (item) groups.push({ kind: 'list', items: [line.slice(2)] });
    else groups.push({ kind: LABEL.test(line) ? 'label' : 'text', text: line });
  }
  return groups;
}

// { shown, folded }: equal-opportunity text and a company's template lines
// fold under one "Show company text" for the whole posting, in their order,
// and are never dropped. The first section with no heading is the opening
// summary, which needs none.
export function sectionView(sections = []) {
  const shown = [];
  const folded = [];
  sections.forEach((section, i) => {
    const into = section.boilerplate ? folded : shown;
    const above = into.at(-1);
    const named = i === 0 || above?.kind === section.kind ? null : KIND_HEADING[section.kind] ?? null;
    into.push({ kind: section.kind, heading: section.heading ?? named, groups: lineGroups(section.lines) });
  });
  return { shown, folded };
}

// The line of facts above the sections: what the text states about years,
// pay and work mode, each with the words that said it.
export function factItems(facts) {
  if (!facts) return [];
  const { years, pay, workMode } = facts;
  return [
    years && { key: 'years', name: 'Experience', value: yearsLabel(years), evidence: years.evidence },
    pay && { key: 'pay', name: 'Pay', value: payText({ payLabel: pay.label, stipend: pay.value }), evidence: pay.evidence },
    workMode && { key: 'mode', name: 'Work mode', value: workModeLabel(workMode.value), evidence: workMode.evidence },
  ].filter((item) => item && item.value);
}
