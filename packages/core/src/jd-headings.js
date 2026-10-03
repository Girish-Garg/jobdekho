// The phrases that open each section of a job ad. Boards flatten bodies to
// one line, so a heading is recognised as the phrase a unit opens with ("You
// will:", "What you will need", "WHAT WE OFFER"), not as a line of its own.
//
// Some boards strip apostrophes ("What you ll be doing", "we re"), so every
// contraction is written with Q: an apostrophe, a space, or nothing.
const Q = "['\\u2019\\s]?"
const H = (src) => new RegExp(`^(?:${src.replace(/Q/g, Q)})`, 'i')

export const HEADINGS = [
  ['nice', H('nice[- ]to[- ]haves?\\b|good[- ]to[- ]haves?\\b|bonus(?: points)?\\b|preferred(?: qualifications| skills| experience)?\\b|desired skills|pluses\\b|plus points|what else will help|it would be (?:great|nice)|added advantage|extra credit|additional (?:skills|qualifications)')],
  ['req', H('requirements?\\b|minimum qualifications|basic qualifications|key qualifications|qualifications?\\b|(?:tech(?:nology)?|our) stack\\b|tech we use|tools we use|required (?:skills|qualifications|experience)|skills(?: required| & experience| and experience)?\\b|key skills|must[- ]haves?\\b|what youQ(?:ll|will)? (?:need|bring)|what weQ(?:re| are) looking for|who you are|you are\\b|you have\\b|about you\\b|your profile|(?:the )?ideal candidate|eligibility(?: criteria)?|technical skills|desired candidate profile|candidate profile|experience\\b|weQ(?:d| would) love|these attributes|what makes you|to succeed|who weQ(?:re| are) looking for|job requirements|skills needed|what you need|you might be a (?:good|great) fit')],
  // Headings stored ads use often that the phrases above do not open: left
  // unread, the requirements under them were taken for company copy.
  ['req', H('minimum requirements|(?:educational|technical)(?:\\s*(?:\\/|and|&)\\s*(?:educational|technical))?\\s+requirements?|mandatory skills?\\b|education(?:al)?(?: qualifications?| background)?\\b')],
  ['resp', H('responsibilities|key responsibilities|roles? (?:and|&) responsibilities|what youQ(?:ll| will) (?:be )?do|you will\\b|youQll\\b|in this role|the role\\b|role overview|about the role|job description|your (?:role|impact|mission|responsibilities)|day[- ]to[- ]day|whatQ(?:s| is) the job|the opportunity|job summary|position summary')],
  ['resp', H('role description|role summary|(?:job|core) responsibilities|job overview|about the (?:job|position|opportunity)')],
  ['benefits', H('benefits|perks|what we offer|we offer|why join|why youQll love|compensation|salary\\b|whatQs in it for you|our benefits|total rewards|rewards\\b|work mode|timezones?')],
  ['eeo', H('equal (?:employment )?opportunit|eeo\\b|diversity|we are an equal|accommodation|privacy|disclaimer|beware|fraud')],
  ['apply', H('how to apply|application process|steps to apply|to apply\\b')],
  ['about', H('about (?:us|the company|the team|[a-z0-9 .&-]{2,30}:)|who we are|our (?:story|mission|culture|values)|company (?:overview|description)|culture\\b|life at|why (?!join|you)[A-Za-z0-9]')],
]

// Words that open a heading AND an ordinary bullet ("Experience with React",
// "You will design..."). In a long unit with no colon they are the bullet,
// so they can lift an intro unit into a section but never end the one it is
// in.
export const WEAK = /^(?:experience|you will|you['’\s]?ll|you have|you are|in this role|the role|culture|skills|education)\b(?!\s*:)/i

// A line marked optional wherever it sits: "Bonus points if you know Svelte"
// is under "You are:" on Supabase's ads.
export const NICE_CUE = /\b(?:nice to have|good to have|bonus|is a plus|are a plus|a big plus|a plus\b|added advantage|preferred|preferably|desirable|would be (?:a )?(?:plus|great|nice|advantage)|advantageous|not required|optional)\b/i

// Company copy before any heading: "we are", "founded", "backed by". Only
// when it does not also speak to the reader, which is the role talking.
export const ABOUT_CUE = /\b(?:we are|we['’]re|our (?:mission|customers|clients|platform|company|team)|founded|headquartered|leading provider|is a (?:leading|global|fast)|backed by|series [a-d]\b)/i
export const YOU_CUE = /\byou\b|\byour\b/i
