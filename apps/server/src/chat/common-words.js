// Words a job-search question uses on its own that are also, in a real
// corpus, the whole name of some company ("Career", "Key", "Nearby", "Side",
// "Reply" and "Ten" all were, measured on the demo corpus of 1542). Without
// this, "which career path fits me?" would pull in every posting from a
// company called Career. The cost of a word here is that a company with that
// exact name cannot be looked up by name; the cost of a word missing is only
// some unrelated rows in the prompt, so the list stays short and specific.
export const COMMON_WORDS = new Set([
  'the', 'and', 'for', 'with', 'which', 'what', 'who', 'how', 'why', 'where', 'when', 'any', 'all', 'some',
  'more', 'less', 'this', 'that', 'these', 'those', 'about', 'from', 'lately', 'known', 'news', 'now', 'new',
  'best', 'top', 'good', 'real', 'fake', 'scam', 'near', 'nearby', 'side', 'key', 'reply', 'ten', 'origin',
  'job', 'jobs', 'work', 'hiring', 'apply', 'role', 'roles', 'team', 'teams', 'company', 'companies',
  'startup', 'startups', 'career', 'careers', 'salary', 'pay', 'stipend', 'intern', 'internship', 'fresher',
  'freshers', 'senior', 'junior', 'lead', 'manager', 'engineer', 'engineers', 'developer', 'developers',
  'software', 'product', 'design', 'sales', 'marketing', 'finance', 'data', 'cloud', 'remote', 'hybrid',
  'onsite', 'office', 'contract', 'experience', 'skills', 'resume', 'cover', 'letter', 'profile', 'fit',
  'match', 'level', 'entry', 'staff', 'india', 'city', 'bengaluru', 'bangalore', 'pune', 'delhi', 'mumbai',
  'hyderabad', 'chennai', 'noida', 'gurgaon', 'gurugram', 'kolkata', 'ahmedabad', 'mnc', 'ups', 'doit',
])
