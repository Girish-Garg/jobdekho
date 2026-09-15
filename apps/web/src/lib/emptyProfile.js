const EMPTY_BASICS = {
  name: '', headline: '', email: '', phone: '', location: '',
  links: { github: '', linkedin: '', portfolio: '' },
};

export const EMPTY_PROFILE = {
  skills: [], titles: [], locations: [], years: null, degree: 'none', resumeName: null,
  basics: EMPTY_BASICS,
  experience: [], projects: [], education: [], certifications: [], achievements: [],
  skillGroups: [],
};

// The server always answers with every key; a profile still loading, or a
// test fixture written before this feature existed, may not. Filling the
// gaps here is what lets every component below read profile.experience.map()
// or profile.basics.links.github without a defensive check of its own.
export function withDefaults(profile) {
  const p = profile ?? {};
  return {
    ...EMPTY_PROFILE,
    ...p,
    basics: { ...EMPTY_BASICS, ...p.basics, links: { ...EMPTY_BASICS.links, ...p.basics?.links } },
  };
}
