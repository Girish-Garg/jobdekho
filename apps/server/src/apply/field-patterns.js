// Which of the person's facts a field asks for, read from the words around
// it (name, id, label, placeholder, aria-label, automation ids), most
// specific first: "first name" before "name", "company name" before "name",
// "country code" before "country". Every pattern runs on text lowercased with
// _ - . [ ] squashed to spaces (see squash in field-classify.js). A few Hindi
// words sit beside the English ones.
export const SLOT_PATTERNS = [
  ['phoneCountry', /\b(country code|dial(ling)? code|phone country|calling code)\b/],
  ['firstName', /\b(first|given|fore) ?name\b|\bfname\b/],
  ['lastName', /\b(last|family|sur) ?name\b|\blname\b|\bsurname\b/],
  ['email', /\be ?mail\b|ईमेल/],
  ['phone', /\b(phone|mobile|cell|telephone|contact (number|no)|whatsapp)\b|मोबाइल|फ़ोन|फोन/],
  ['linkedin', /\blinked ?in\b/],
  ['github', /\bgit ?hub\b/],
  ['portfolio', /\b(portfolio|personal (site|website)|website|blog|homepage)\b/],
  ['company', /\b((current|present|most recent|latest) (company|employer|organi[sz]ation)|company name|employer|org)\b/],
  ['title', /\b((current|present|most recent|latest) (job )?(title|role|designation|position)|job title|designation)\b/],
  ['years', /\b(years? of (total |professional |work |relevant )?experience|total experience|experience in years|yoe)\b/],
  ['gradYear', /\b((graduation|passing|pass ?out) (year|date)|year of (graduation|passing))\b/],
  ['school', /\b(school|college|university|institute|institution|alma mater)\b/],
  ['discipline', /\b(discipline|major|field of study|speciali[sz]ation|branch)\b/],
  ['degree', /\b(degree|qualification)\b/],
  ['city', /\b(city|current location|location|town|where are you (based|located))\b/],
  ['country', /\bcountry\b/],
  ['fullName', /\b(full name|your name|legal name|candidate name|name)\b|नाम/],
]

// Words that put a field beyond a slot whatever else it says: a referrer's
// or a parent's name is not the candidate's, a preferred location is not
// where they live, and "why this company" is a question, not an employer.
const OTHER_PEOPLE = /\b(refer(red|rer|ral)?|reference|referee|emergency|manager|recruiter|supervisor|father|mother|spouse|parent|guardian|nominee|card|company|school|college|university|institute|employer|project|user ?name)\b/
const A_QUESTION = /\b(why|what|how|describe|tell us|explain)\b/

export const SLOT_GUARDS = {
  firstName: OTHER_PEOPLE,
  lastName: OTHER_PEOPLE,
  fullName: OTHER_PEOPLE,
  email: /\b(refer(red|rer|ral)?|reference|referee|manager|recruiter)\b/,
  phone: /\b(refer(red|rer|ral)?|reference|referee|emergency|manager)\b/,
  city: /\b(preferred|desired|willing|relocat\w*|job location|work location|office)\b/,
  company: A_QUESTION,
  title: A_QUESTION,
  school: A_QUESTION,
  portfolio: /\b(company|employer)\b/,
}

// File inputs: a cover letter first, since "cover letter" never means a
// resume while a resume field may mention letters.
export const FILE_PATTERNS = [
  ['cover', /\bcover ?letter\b/],
  ['resume', /\b(resume|cv|curriculum vitae|bio ?data)\b/],
]

// What a declared autocomplete token means, which outranks any wording.
export const DECLARED = {
  'given-name': 'firstName',
  'family-name': 'lastName',
  name: 'fullName',
  email: 'email',
  tel: 'phone',
  'tel-national': 'phone',
  'tel-country-code': 'phoneCountry',
  'address-level2': 'city',
  country: 'country',
  'country-name': 'country',
  organization: 'company',
  'organization-title': 'title',
  url: 'portfolio',
}
