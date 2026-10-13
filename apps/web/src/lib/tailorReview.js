// A tailoring as the person reviews it: what each skill, entry and bullet
// will do in the resume, worked out here from what the plan did (the review
// the server lays out, see its actions/resume-tailor-view.js) and their own
// choices (checked by its actions/resume-tailor-choices.js), so a click
// redraws at once and only the choices travel back.
export const NO_CHOICES = { skills: [], skillsOut: [], flipped: [], mine: {}, back: {}, cut: {}, compact: false };

export const choicesOf = (review) => ({ ...NO_CHOICES, ...(review?.choices ?? {}) });

const without = (list, value) => list.filter((one) => one !== value);
const listed = (list = [], value, on) => (on ? [...without(list, value), value] : without(list, value));

// A skill the plan left out is out until put back; any other is in until
// the person takes it out.
export function skillOut(choices, skill) {
  return skill.leftOut ? !choices.skills.includes(skill.name) : choices.skillsOut.includes(skill.name);
}

export function withSkill(choices, skill, out) {
  if (skill.leftOut) return { ...choices, skills: listed(choices.skills, skill.name, !out) };
  return { ...choices, skillsOut: listed(choices.skillsOut, skill.name, out) };
}

// An entry is flipped from what the plan did with it, or not.
const shownByPlan = (entry) => entry.state !== 'out';

export const entryShown = (choices, entry) => shownByPlan(entry) !== choices.flipped.includes(entry.id);

export const withEntry = (choices, entry, shown) => ({ ...choices, flipped: listed(choices.flipped, entry.id, shown !== shownByPlan(entry)) });

// Own lists only, so an entry id named like an object property finds none.
const listOf = (map, id) => (map && Object.hasOwn(map, id) ? map[id] : []);

// `field` is 'mine' (a rewording printed as the person's own), 'cut' (a
// rewording they removed) or 'back' (a dropped bullet printed after all).
export const bulletIs = (choices, field, id, at) => listOf(choices[field], id).includes(at);

export function withBullet(choices, field, id, at, on) {
  const next = listed(listOf(choices[field], id), at, on).sort((a, b) => a - b);
  return { ...choices, [field]: { ...choices[field], [id]: next } };
}

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// One line for the chat's card, off the saved plan: what there is to look
// at on the review screen, in the order the screen shows it.
export function planSummary(result) {
  const entries = Object.values(result?.sections ?? {}).flat();
  const skills = result?.leftOut?.skills?.length ?? 0;
  const projects = result?.leftOut?.projects?.length ?? 0;
  const reworded = entries.reduce((sum, entry) => sum + (entry.was ?? []).filter((was) => was.length).length, 0);
  const dropped = entries.reduce((sum, entry) => sum + (entry.dropped?.length ?? 0), 0);
  return [
    skills && `${count(skills, 'skill', 'skills')} left out`,
    projects && `${count(projects, 'project', 'projects')} left out`,
    reworded && `${count(reworded, 'bullet', 'bullets')} reworded`,
    dropped && `${count(dropped, 'bullet', 'bullets')} dropped`,
  ].filter(Boolean).join(', ');
}
