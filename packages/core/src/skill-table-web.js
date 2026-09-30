// Web and JavaScript skills. A row is [id, label, aliases, meta].
//
// An alias is the same skill spelled another way. A string is matched on
// word edges, ignoring case. { re } is for a word that is also English
// ("Node", "Express", "REST") or needs its own edges ("JS" but not the one
// in "Node.js"); its { text } is the plain spelling a resume may use.
//
// meta.kindOf: a variant of another skill, so it implies that skill and a
// resume naming it shows it (MySQL shows SQL). meta.implies: knowing this
// means knowing those, for the fit only (TypeScript implies JavaScript, but
// a resume saying TypeScript does not show JavaScript). meta.near: part
// credit when a job asks for this and the person holds the other instead.
// Two tools are never one row, however close: Tableau is not Power BI.
// meta.generic: named by nearly every ad, so matching it proves little.
export const WEB_SKILLS = [
  ['javascript', 'JavaScript', ['javascript', 'java script', 'ecmascript', 'es6', 'es2015', 'vanilla js',
    { re: /(?<![\w.#/-])js(?![\w-])/gi, text: 'js' }]],
  ['typescript', 'TypeScript', ['typescript', { re: /(?<![\w.#-])TS(?![\w-])/g, text: 'ts' }], { implies: ['javascript'] }],
  ['react native', 'React Native', ['react native', 'react-native'], { implies: ['javascript'], near: { react: 0.5 } }],
  ['react', 'React', ['react', 'reactjs', 'react.js', 'react js'], { implies: ['javascript', 'html', 'css'] }],
  ['next.js', 'Next.js', ['next.js', 'nextjs', 'next js'], { implies: ['react', 'javascript'], near: { react: 0.7 } }],
  ['redux', 'Redux', ['redux', 'redux toolkit'], { implies: ['javascript'], near: { react: 0.6 } }],
  ['angular', 'Angular', ['angular', 'angularjs', 'angular.js'], { implies: ['javascript', 'html', 'css'], near: { react: 0.35, vue: 0.35 } }],
  ['vue', 'Vue', ['vue', 'vue.js', 'vuejs', 'nuxt', 'nuxt.js'], { implies: ['javascript', 'html', 'css'], near: { react: 0.4 } }],
  ['svelte', 'Svelte', ['svelte', 'sveltekit'], { implies: ['javascript'], near: { react: 0.4 } }],
  ['jquery', 'jQuery', ['jquery'], { implies: ['javascript'] }],
  ['node', 'Node.js', ['node.js', 'nodejs', 'node js',
    { re: /\bNode\b(?!\s*(?:pools?|groups?|affinity))/g, text: 'node' }], { implies: ['javascript'] }],
  ['express', 'Express', ['express.js', 'expressjs', 'express js', { re: /\bExpress\b/g, text: 'express' }],
    { implies: ['node'], near: { node: 0.7 } }],
  ['nestjs', 'NestJS', ['nestjs', 'nest.js', 'nest js'], { implies: ['node', 'typescript'], near: { express: 0.7, node: 0.6 } }],
  ['html', 'HTML', ['html', 'html5']],
  ['css', 'CSS', ['css', 'css3']],
  ['sass', 'Sass', ['sass', 'scss'], { kindOf: 'css' }],
  ['tailwind', 'Tailwind CSS', ['tailwind', 'tailwindcss', 'tailwind css'], { implies: ['css'] }],
  ['bootstrap', 'Bootstrap', ['bootstrap'], { implies: ['css'] }],
  ['graphql', 'GraphQL', ['graphql']],
  ['rest api', 'REST APIs', ['rest api', 'rest apis', 'restful', 'restful api', 'restful apis', 'rest services',
    { re: /\bREST\b/g }], { generic: 0.3 }],
  ['microservices', 'Microservices', ['microservices', 'micro-services', 'microservice'], { generic: 0.5 }],
  ['wordpress', 'WordPress', ['wordpress']],
  ['shopify', 'Shopify', ['shopify']],
  ['websockets', 'WebSockets', ['websockets', 'websocket', 'socket.io']],
]
