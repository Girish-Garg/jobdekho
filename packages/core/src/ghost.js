// The web app's Caution chip reads `legitimacy` and the pane's "worth a
// second look" box `ghostSignals`, until it reads `caution` itself. Both
// come from the strict red flags alone (see caution.js), so the chip says
// what Caution means: "no pay stated" plus a short text is no red flag, and
// it marked Infosys, EY and Google.
// `posting.caution` is the whole list, the corpus-wide flags included.
export const ghostSignals = (posting) => (posting?.caution ?? []).map((flag) => flag.reason)

export const legitimacy = (posting) => (posting?.caution?.length ? 'low' : 'high')

// Tool and language names: the resume tailoring's keyword coverage starts
// from this list.
export const TOOL_TERMS = [
  'javascript', 'typescript', 'python', 'java', 'kotlin', 'swift', 'c++', 'c#',
  'golang', 'php', 'ruby', 'rust', 'scala', 'matlab', 'react', 'angular', 'vue',
  'node', 'node.js', 'next.js', 'django', 'flask', 'spring', 'laravel', 'rails',
  '.net', 'html', 'css', 'tailwind', 'bootstrap', 'wordpress', 'shopify',
  'android', 'ios', 'flutter', 'sql', 'mysql', 'postgresql', 'mongodb', 'redis',
  'kafka', 'spark', 'hadoop', 'snowflake', 'tableau', 'power bi', 'excel',
  'pandas', 'numpy', 'tensorflow', 'pytorch', 'opencv', 'aws', 'azure', 'gcp',
  'docker', 'kubernetes', 'terraform', 'jenkins', 'git', 'linux', 'selenium',
  'graphql', 'api', 'figma', 'photoshop', 'illustrator', 'canva', 'autocad',
  'solidworks', 'jira', 'salesforce', 'sap', 'tally', 'seo', 'google analytics',
  'unity', 'blender',
]
