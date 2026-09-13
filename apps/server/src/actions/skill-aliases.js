// Other spellings a resume uses for a skill the vocabulary names one way.
// Read ONLY when judging whether the original resume shows a skill, never
// when counting matches: a keyword matcher, the feed's fit score included,
// sees "ReactJS" and "React" as different strings. That is exactly why the
// rewrite spelling a skill the posting's way is an honest gain worth
// crediting rather than an invention worth flagging, and why the table stays
// small: every entry is a spelling of the SAME thing, never a related one
// ("mysql" shows sql, "django" does not show python).
const ALIASES = {
  javascript: ['js', 'es6', 'ecmascript'],
  typescript: ['ts'],
  react: ['reactjs', 'react.js'],
  node: ['nodejs', 'node.js', 'node js'],
  'node.js': ['nodejs', 'node', 'node js'],
  'next.js': ['nextjs', 'next js'],
  vue: ['vuejs', 'vue.js'],
  angular: ['angularjs'],
  express: ['expressjs', 'express.js'],
  'express.js': ['expressjs', 'express'],
  'react native': ['react-native'],
  postgresql: ['postgres', 'psql'],
  postgres: ['postgresql', 'psql'],
  mongodb: ['mongo'],
  sql: ['mysql', 'postgresql', 'postgres', 'mssql', 'sqlite', 'plsql', 'pl/sql', 't-sql', 'sql server'],
  'sql server': ['mssql'],
  kubernetes: ['k8s'],
  'machine learning': ['ml'],
  'deep learning': ['dl'],
  'artificial intelligence': ['ai'],
  nlp: ['natural language processing'],
  aws: ['amazon web services'],
  gcp: ['google cloud', 'google cloud platform'],
  azure: ['microsoft azure'],
  'c++': ['cpp'],
  'c#': ['csharp', 'c sharp'],
  html: ['html5'],
  css: ['css3'],
  'ci/cd': ['cicd', 'ci-cd', 'ci cd', 'continuous integration'],
  'rest api': ['rest apis', 'restful api', 'restful apis', 'restful'],
  'rest apis': ['rest api', 'restful apis', 'restful'],
  'scikit-learn': ['sklearn', 'scikit learn'],
  sklearn: ['scikit-learn', 'scikit learn'],
  'power bi': ['powerbi'],
  excel: ['ms excel', 'microsoft excel', 'advanced excel'],
  'github actions': ['gh actions'],
  'spring boot': ['springboot'],
  'ms office': ['microsoft office'],
  'ms excel': ['excel', 'microsoft excel'],
  'ms project': ['microsoft project'],
  'financial modelling': ['financial modeling'],
  'financial modeling': ['financial modelling'],
}

// Every spelling under which the original may show `term`, the term itself
// and its plural included, so "REST APIs" shows "rest api" and "containers"
// does not have to be listed for "container".
export function spellingsOf(term) {
  return [term, `${term}s`, ...(ALIASES[term] || [])]
}
