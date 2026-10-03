// How much a skill named in each part of an ad says about what the job
// needs. A skill in the title is what the role IS ("Golang Developer"), so
// it counts twice a requirement line, the same ratio the old title and body
// credits encoded. Duties say what it uses; an unlabelled intro is half role,
// half company; a nice-to-have is optional; about-us, benefits and EEO copy
// say nothing about the role at all, and nor do the steps to apply.
export const SECTION_WEIGHT = {
  title: 2, req: 1, tags: 0.8, resp: 0.7, intro: 0.5, other: 0.5, nice: 0.3, about: 0, benefits: 0, eeo: 0, apply: 0,
}
