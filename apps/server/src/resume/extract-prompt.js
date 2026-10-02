// What "Fill in from resume" asks for. One object covers the whole record
// the profile can hold, because the person reviews it all at once: the
// ranking fields at the top are saved, the basics fill only fields left
// empty, and every list below them is a proposal (see api/profile-fill.js).
// The links paragraph is what the list after the resume is for (see
// link-appendix.js): a PDF's links are not in its text.
export const INSTRUCTION = `Read the resume below and reply with ONE JSON object and nothing else.
No prose, no markdown fence. Shape:
{"skills":[],"titles":[],"locations":[],"years":<number>,"degree":"none|bachelors|masters|phd",
"basics":{"name":"","headline":"","email":"","phone":"","location":"","links":{"github":"","linkedin":"","portfolio":""}},
"skillGroups":[{"name":"","items":[]}],
"experience":[{"title":"","organisation":"","location":"","startDate":"","endDate":"","bullets":[],"link":""}],
"projects":[{"title":"","organisation":"","startDate":"","endDate":"","bullets":[],"tech":[],"link":""}],
"education":[{"title":"","organisation":"","location":"","startDate":"","endDate":""}],
"certifications":[{"title":"","organisation":"","startDate":"","endDate":"","link":""}],
"achievements":[{"title":"","organisation":"","startDate":"","bullets":[],"link":""}]}

skills: concrete technologies and tools only, lowercase, at most 25. No soft skills.
titles: job titles actually held or clearly targeted, lowercase.
locations: cities or regions the person is in or wants, lowercase.
years: total years of professional experience as a number. Internships count as
  0.5 each. Use 0 for a student or new graduate.
degree: the HIGHEST completed or in-progress degree. "none" if unclear.

basics: the person's own details, written as they appear. headline is the
  one line saying who they are professionally, "" if there is none. links
  are full addresses of their GitHub profile, LinkedIn profile and personal
  site or portfolio. "" for anything the resume does not show.
skillGroups: the skills grouped exactly the way the resume groups them, its
  group names ("Languages", "Frameworks") and items written as they appear.
  One group named "Skills" when the resume lists them without groups.

experience: one entry per job or internship actually held, most recent first.
  title is the role held, organisation is the employer, dates and bullets are
  written as they appear in the resume.
projects: one entry per project, side project or piece of coursework named on
  its own. organisation is the employer or context it was built under, or ""
  for independent work. tech is the stack named for that project only.
education: one entry per degree or programme. title is the degree or
  programme name, organisation is the institution.
certifications: one entry per certificate or licence. title is the
  certificate name, organisation is the issuer, startDate is when it was
  issued, endDate is when it expires or "" if it does not, link is the
  credential URL.
achievements: one entry per award, ranking, scholarship, publication or
  competition result. title is the achievement, organisation is the awarding
  body or the context it was won in, startDate is its date, bullets are any
  details given.

link: a link is either written out in the resume text or listed after it
  under LINKS IN THE RESUME, one per line as visible text -> address,
  followed by (on the line: ...) when the resume line it sits on helps
  place it. Give a job, project, certification or achievement the link that
  sits in it, matched by its visible text and the entry around it. Copy
  addresses exactly and never invent one. "" for an entry with no link.
  mailto: and tel: links are the person's email and phone. A link that
  belongs to no entry goes in basics.links.github or basics.links.linkedin
  when it is their profile there, in basics.links.portfolio only when it is
  clearly their own personal site, and is left out otherwise.

Leave out any array the resume has nothing for. The entry arrays and
skillGroups are PROPOSALS: whatever you list is offered to the person for
review, never written over anything they already have, so include every
entry you can find rather than picking a "best" few.

RESUME:
`
