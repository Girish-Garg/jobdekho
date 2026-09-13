// A realistic two-year profile. Note what makes it a fair test: 2022 appears
// twice already (a project and an award), so a changed employment year
// cannot be caught by value alone; skills appear under spellings a keyword
// matcher does not equate (ReactJS, Node JS, Postgres); and the pay uses
// Indian grouping.
export const ORIGINAL = `Priya Sharma
Pune, Maharashtra | priya.sharma@example.com | +91 98765 43210 | github.com/priyasharma

PROFESSIONAL SUMMARY
Full stack developer with 2 years of experience building web applications with ReactJS, Node JS and Postgres. B.Tech in Computer Science and Engineering from Savitribai Phule Pune University.

WORK EXPERIENCE
Software Developer, Infobeans Technologies, Pune (Jul 2023 to Present)
- Developed the customer onboarding portal in ReactJS and Node JS used by 40,000 monthly users.
- Reduced API response time by 35% by adding Redis caching and query indexes in Postgres.
- Wrote unit tests with Jest, raising coverage from 48% to 81%.
- Set up CI pipelines on GitHub Actions and deployed containers with Docker on AWS EC2.
- Mentored 2 interns on code review and Git workflow.

Software Developer Intern, Zensar Technologies, Pune (Jan 2023 to Jun 2023)
- Built REST APIs in Express for an internal leave management tool with 1,200 employees.
- Migrated 15 legacy jQuery pages to ReactJS.

PROJECTS
Campus Marketplace (2022): A buy and sell app for students built with ReactJS, Express and MongoDB. 300 users in the first month.
Expense Tracker (2021): Android app in Kotlin with a Firebase backend.

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, Kotlin, SQL
Frameworks: ReactJS, Node JS, Express, Jest
Tools: Docker, Git, GitHub Actions, AWS, Redis, Postgres, MongoDB, Firebase

EDUCATION
B.Tech, Computer Science and Engineering, Savitribai Phule Pune University, 2019 to 2023, CGPA 8.4

ACHIEVEMENTS
Winner, Smart India Hackathon 2022 (team of 6), stipend of Rs 1,00,000.
`

// An honest tailoring for a Node.js backend posting: reordered, reworded,
// standard headings, the Android project dropped, and the posting's own
// spellings used where the original supports them.
export const HONEST = `Priya Sharma
Pune, Maharashtra | priya.sharma@example.com | +91 98765 43210 | github.com/priyasharma

Summary
Backend focused full stack developer with two years of experience shipping Node.js services and REST APIs on PostgreSQL, Redis and AWS. B.Tech in Computer Science and Engineering, Savitribai Phule Pune University.

Skills
Backend: Node.js, Express, REST APIs, PostgreSQL, Redis, MongoDB
Languages: JavaScript, TypeScript, Python, SQL
Cloud and Tooling: AWS, Docker, GitHub Actions, Git, Jest

Experience
Software Developer, Infobeans Technologies, Pune (July 2023 to Present)
- Cut API response time by 35 % with Redis caching and PostgreSQL query indexes.
- Built and maintained Node.js services behind the customer onboarding portal serving 40000 monthly users.
- Set up CI pipelines on GitHub Actions and shipped Docker containers to AWS EC2.
- Raised unit test coverage from 48% to 81% with Jest.
- Mentored 2 interns on code review and Git workflow.

Software Developer Intern, Zensar Technologies, Pune (Jan 2023 to Jun 2023)
- Designed REST APIs in Express for a leave management tool used by 1,200 employees.

Projects
Campus Marketplace (2022): Express and MongoDB backend for a student buy and sell app with React frontend; 300 users in the first month.

Education
B.Tech, Computer Science and Engineering, Savitribai Phule Pune University, 2019-2023, CGPA 8.4

Achievements
Winner, Smart India Hackathon 2022 (team of 6), stipend of Rs 100000.
`

export const JD = `Backend Engineer (Node.js)
We are looking for a backend engineer with 1 to 3 years of experience. Must have: Node.js, Express, PostgreSQL, Redis, REST APIs, Docker, AWS. Good to have: Kafka, Kubernetes, TypeScript, GraphQL, CI/CD with GitHub Actions. You will design microservices and own their reliability.`
