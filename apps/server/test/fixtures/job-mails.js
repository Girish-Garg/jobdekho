// Made-up job mail, the kinds a real mailbox holds: hiring systems'
// confirmations and rejections, a test link, an interview, an offer, a
// board's "sent", the person's own application by mail and a recruiter's
// reply in its thread, and the noise a scan must leave out. Every company,
// person and address here is invented.
export const ME = 'me@example.com'

export const JOB_MAILS = [
  { id: 'gh1@globex', from: 'Globex Recruiting <no-reply@us.greenhouse-mail.io>', subject: 'Thank you for applying to Globex', date: '2026-09-02T09:00:00Z',
    text: 'Hi, thank you for your interest in the Frontend Developer role. We have received your application. https://boards.greenhouse.io/globex/jobs/1' },
  { id: 'iv1@globex', from: 'Meera at Globex <meera@globex.example>', subject: 'Interview invitation: Frontend Developer at Globex', date: '2026-09-20T09:00:00Z',
    text: 'We would like to invite you to an interview for the Frontend Developer role. Does Friday work?' },
  { id: 'lv1@initech', from: 'Initech <no-reply@hire.lever.co>', subject: 'Your application to Initech', date: '2026-09-05T09:00:00Z',
    text: 'Thanks for applying for the SDE Intern position. https://jobs.lever.co/initech/abc' },
  { id: 'hr1@initech', from: 'HackerRank <support@hackerrank.com>', subject: 'Initech has invited you to take a test', date: '2026-09-09T09:00:00Z',
    text: 'Initech has invited you to take the SDE Intern online test. Complete the test by 12 September.' },
  { id: 'lv2@initech', from: 'Initech <no-reply@hire.lever.co>', subject: 'Update on your application to Initech', date: '2026-09-30T09:00:00Z',
    text: 'Thank you for applying. Unfortunately, we have decided to move forward with other candidates for this role.' },
  { id: 'wd1@stark', from: 'Stark Labs <starklabs@myworkday.com>', subject: 'Offer letter: Backend Developer', date: '2026-10-14T09:00:00Z',
    text: 'We are delighted to offer you the position of Backend Developer at Stark Labs. Please reply by 20 October.' },
  { id: 'li1@umbrella', from: 'LinkedIn <jobs-noreply@linkedin.com>', subject: 'Your application was sent to Umbrella Health', date: '2026-10-06T09:00:00Z',
    text: 'Your application was sent to Umbrella Health. Android Intern, Pune.' },
  { id: 'me1@acme', from: `Me <${ME}>`, to: 'Priya <priya@acmelabs.example>', thread: 'acme', subject: 'Application for Backend intern', date: '2026-10-10T09:00:00Z',
    text: 'Hi Priya, I would like to apply for the backend internship. My resume is attached.' },
  { id: 'pr1@acme', from: 'Priya <priya@acmelabs.example>', thread: 'acme', inReplyTo: 'me1@acme', subject: 'Re: Application for Backend intern', date: '2026-10-12T09:00:00Z',
    text: 'Hi, thanks for writing. Could you share your availability for a quick call this week?' },
  // Noise: a board's alert and a bank's "application" (dropped on the
  // subject), a club's application (no job in it), and a board's tips mail
  // (a board's "interview" is not taken as sure).
  { id: 'nk1@alert', from: 'Naukri <jobalert@naukri.com>', subject: 'Jobs for you: 25 new jobs matching your profile', date: '2026-10-01T09:00:00Z', text: 'Apply now to these jobs.' },
  { id: 'bk1@bank', from: 'Bank <alerts@bank.example>', subject: 'Your credit card application is approved', date: '2026-10-02T09:00:00Z', text: 'Your card is on its way.' },
  { id: 'cl1@club', from: 'Club <team@club.example>', subject: 'Your application for the photo walk', date: '2026-10-03T09:00:00Z', text: 'See you on Sunday at 7 am.' },
  { id: 'nk2@tips', from: 'Naukri <info@naukri.com>', subject: 'Interview tips for freshers', date: '2026-10-04T09:00:00Z', text: 'Ten interview questions every developer gets.' },
]
