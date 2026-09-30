// Languages, backend frameworks and databases. Same row shape and rules as
// skill-table-web.js.
export const BACKEND_SKILLS = [
  ['python', 'Python', ['python', 'python3']],
  ['django', 'Django', ['django'], { implies: ['python'] }],
  ['flask', 'Flask', ['flask'], { implies: ['python'] }],
  ['fastapi', 'FastAPI', ['fastapi', 'fast api'], { implies: ['python'] }],
  ['java', 'Java', ['java', 'core java', 'java8', 'java 8', 'java 11', 'java 17', 'j2ee', 'java ee']],
  // "Spring" alone is also a season, so only its capitalised form counts.
  ['spring', 'Spring Boot', ['spring boot', 'springboot', 'spring framework', 'spring mvc',
    { re: /\bSpring\b/g }], { implies: ['java'] }],
  ['hibernate', 'Hibernate', ['hibernate'], { implies: ['java'] }],
  ['kotlin', 'Kotlin', ['kotlin'], { near: { java: 0.5 } }],
  // "Go" is an everyday word; it counts as the language only where a tech
  // list puts it: "Go," "Go/", "(Go)", "in Go", "Go developer", and a list's
  // last item ("Java and Go.").
  ['go', 'Go', ['golang', { re: /\bGo\b(?=\s*(?:[,/)(]|and\b|or\b|[Dd]eveloper|[Ee]ngineer|[Pp]rogramming|[Ll]anguage))|(?<=[,/(]\s?)\bGo\b|(?<=\bin\s)Go\b|(?<=\b(?:and|or)\s)Go\b(?=\s*(?:[.;]|$))/g }]],
  ['rust', 'Rust', ['rust']],
  ['cpp', 'C++', ['c++', 'cpp']],
  ['csharp', 'C#', ['c#', 'csharp', 'c sharp']],
  ['dotnet', '.NET', ['.net', 'dotnet', 'asp.net', '.net core', 'dot net'], { implies: ['csharp'] }],
  ['php', 'PHP', ['php']],
  ['laravel', 'Laravel', ['laravel'], { implies: ['php'] }],
  ['ruby', 'Ruby', ['ruby']],
  ['rails', 'Ruby on Rails', ['ruby on rails', 'rails', 'ror'], { implies: ['ruby'] }],
  ['scala', 'Scala', ['scala']],
  ['sql', 'SQL', ['sql']],
  ['sql server', 'SQL Server', ['sql server', 'mssql', 'ms sql', 't-sql', 'tsql'], { kindOf: 'sql' }],
  ['plsql', 'PL/SQL', ['pl/sql', 'plsql'], { kindOf: 'sql' }],
  ['postgres', 'PostgreSQL', ['postgres', 'postgresql', 'psql', 'postgre sql', 'postgre'], { kindOf: 'sql', near: { mysql: 0.7 } }],
  ['mysql', 'MySQL', ['mysql', 'my sql', 'mariadb'], { kindOf: 'sql', near: { postgres: 0.7 } }],
  ['sqlite', 'SQLite', ['sqlite'], { kindOf: 'sql' }],
  ['oracle', 'Oracle Database', ['oracle', 'oracle db', 'oracle database'], { kindOf: 'sql' }],
  ['nosql', 'NoSQL', ['nosql', 'no-sql']],
  ['mongodb', 'MongoDB', ['mongodb', 'mongo', 'mongo db', 'mongoose'], { implies: ['nosql'] }],
  ['redis', 'Redis', ['redis']],
  ['elasticsearch', 'Elasticsearch', ['elasticsearch', 'elastic search', 'opensearch']],
  ['firebase', 'Firebase', ['firebase']],
  ['supabase', 'Supabase', ['supabase'], { implies: ['postgres'] }],
  ['kafka', 'Kafka', ['kafka', 'apache kafka']],
  ['rabbitmq', 'RabbitMQ', ['rabbitmq']],
  ['grpc', 'gRPC', ['grpc']],
]
