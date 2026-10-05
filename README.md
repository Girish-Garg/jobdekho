# JobDekho

JobDekho is a job finder for the Indian tech job market that runs entirely on
your own computer. It scrapes company ATS boards, Indian job boards, and a few
remote boards into local files, scores each posting against your profile with
a fit percentage, and flags postings that look like ghost or evergreen
listings. It can also drive an AI you already have, from buttons and a chat
panel in the browser: to check whether a job is real, write a cover letter,
tailor your resume, fill in your profile from a resume, or change your
resumes and cover letters, which it keeps as LaTeX documents and turns into
PDFs. There is no database, no Docker, no hosting, and no account to create.

It is for one person hunting a job in India, anywhere from a first internship
to a senior role, who wants a ranked feed instead of scrolling job boards by
hand.

## Quick start

With [Node.js](https://nodejs.org) 22 or newer installed, run:

```
npx jobdekho@latest
```

That is all. It downloads JobDekho, starts it on this computer and opens it
in your browser. Keep that window open while you use it: JobDekho runs, and
refreshes postings once a day, only while it is open. Ctrl+C stops it. Run
the same command next time; it fetches the newest version, and your data
stays where it was.

From there to a ranked feed: install an AI (see
[Choosing an AI](#choosing-an-ai)), fill in your profile (upload a resume and
press "Fill in from resume"), and press **Refresh now** in Settings, under
Postings. The setup check below says what is still missing.

Options, for when the defaults do not suit (for example
`npx jobdekho@latest --port 5000`):

| Option | What it does |
| --- | --- |
| `--port <number>` | The port to serve on. Default 4747, or the next free one. |
| `--data <folder>` | Keep your data in this folder instead of the default below. |
| `--no-open` | Leave the browser closed; open the address it prints yourself. |
| `--version`, `--help` | Print the version, or the options. |

Your data stays on your computer, in your user data folder:

- Windows: `%APPDATA%\JobDekho`
- macOS: `~/Library/Application Support/JobDekho`
- Linux: `~/.local/share/jobdekho` (or `$XDG_DATA_HOME/jobdekho`)

The command serves this computer alone (`127.0.0.1`), and it ignores any
`.env` in the folder you run it from, which belongs to some other project.
The other settings under [Configuration](#configuration) can be set in your
shell before running it.

### The setup check

Settings has a **Setup check** card that says what JobDekho found on this
computer and, for anything missing, one sentence on what to do:

- **An AI to answer with**: whether Claude Code, Antigravity or Ollama runs.
- **PDF making**: whether LaTeX (`pdflatex`) was found.
- **Your profile**: whether it has skills, target titles or years to rank
  postings against.
- **Postings**: how many are stored and when the last refresh ran.
- **Web search** and **Ollama on this computer**, both optional: whether an
  AI can search the web right now, and whether Ollama runs here.

It never asks a model anything; it reads the same cached detection the AI
buttons use, looks LaTeX up on the PATH, and reads the local files. "Check
again" probes the AIs afresh. An installer that changed the PATH is only seen
once JobDekho is restarted, since it looks things up on the PATH it was
started with. While something required is missing, the Postings page shows a
short notice naming it, with a button to Settings; it can be dismissed for
the session.

## Requirements

- Node 22 or newer. `.nvmrc` still says 20, but `unpdf`, which reads the text
  out of an uploaded resume, declares Node 22 or newer.
- An AI to answer with, for the AI features: Claude Code, Antigravity, or
  Ollama (see [Choosing an AI](#choosing-an-ai)). The feed, the ranking, the
  filters and the documents all work without one.
- LaTeX, to turn documents into PDFs: [MiKTeX](https://miktex.org/download)
  on Windows, [TeX Live](https://tug.org/texlive) on macOS or Linux. Without
  it, documents still work as LaTeX source you can edit and download as a
  `.tex` file; only the PDF waits on it. JobDekho looks for `pdflatex` on the
  PATH it was started with.
- Optional: [Ollama](https://ollama.com), to run the AI on this computer.

Everything else comes with JobDekho itself.

## Running from source

To work on JobDekho, or to run a version that is not published yet. The repo
is an npm workspaces monorepo (`packages/*`, `apps/*`).

```
git clone https://github.com/Girish-Garg/jobdekho.git
cd jobdekho
npm install
npm run build
npm start
```

Then open http://localhost:3000. Run this way, your data goes in `data/`
inside the repo.

No `.env` is needed: every setting has a working default (see
[Configuration](#configuration)). To change one, copy `.env.example` to
`.env` (`copy .env.example .env` in the Windows command prompt) and edit it.

`npm run build` builds the web app once (`apps/web`, via Vite). `npm start`
runs the Fastify server, which serves both the API and that build from one
origin, port 3000 by default. If you skip the build, the server still starts
and the API still works, it just has no page to serve: it logs that it found
no build and skips static serving. Rebuild and restart after any change to
the web app. The server maps each built file to its own route at startup, so
a rebuild without a restart leaves the old routes in place and the browser
asks for files that no longer exist, which shows up as a blank page.

## Choosing an AI

Every AI feature asks an AI through a program on your own computer, on your
own subscription or your own hardware; JobDekho holds no API key. Three are
supported, and any one is enough.

- **Claude Code** ([claude.ai/code](https://claude.ai/code)), installed and
  signed in. JobDekho runs it as a one-shot CLI (`claude -p`, the prompt over
  stdin), one process per call. It can run every action, including the ones
  that search the web.
- **Antigravity**'s `agy` CLI ([antigravity.google](https://antigravity.google)),
  installed and signed in. JobDekho drives it headless (`agy -p=`, the prompt
  over stdin as stream-json). It has no flag for a tool list, so for every
  call JobDekho writes a small agent file into that call's own temporary
  folder whose tool list is the call's policy: no tools, or web search alone.
  Antigravity does not fail when it cannot find a named agent; it quietly
  runs its default one with every tool. So JobDekho reads Antigravity's own
  log for the call and only uses the answer when the log says its agent ran
  and no tool outside the list was called. Otherwise the answer is thrown
  away and the next AI is asked. On web questions it reads search results but
  does not open pages, so its answers there are a little thinner.
- **Ollama** ([ollama.com](https://ollama.com)), which runs a model on this
  computer, so the prompt never leaves it. Install it, pull a model (for
  example `ollama pull llama3.2`), and keep it running: the Ollama app starts
  its server on Windows and macOS, `ollama serve` does on Linux. JobDekho
  talks to its local API at 127.0.0.1:11434 (or `OLLAMA_HOST`, when that
  names this computer; any other host is ignored), sizes the context to each
  prompt, and leaves out cloud models, which would send the prompt to
  ollama.com. To let it search the web, sign it in with `ollama signin` (a
  free ollama.com account) and pull a model that can use tools, such as
  `qwen3:4b`. A local model is slower, so its calls get three times the usual
  time limit.

JobDekho finds each AI on the PATH it was started with and checks it runs
without a model call: a version probe for a CLI, a read of the local server
for Ollama. The answer is cached for a minute. Whether you are signed in is
only found out by the first real call, which then says what to do.

**Settings > AI CLI** picks which AI is asked first. Left on "Whichever is
available", the order is Claude Code, then Antigravity, then Ollama: the
first that is installed, runs, and can take the action answers. Picking one
puts it first. Either way, when the AI asked turns out to be signed out,
missing, or (Antigravity) could not be confirmed to have kept to its tools,
the next one that can take the action is asked instead. A timeout or an
answer that could not be read is not passed on, since another AI would only
cost a second call to say the same.

Pick one AI there and its model picker appears under it: Default, Fable,
Opus, Sonnet and Haiku for Claude Code; the models `agy models` lists for
Antigravity; the models you have pulled, with their size on disk, for
Ollama. Default leaves the choice to the CLI. Each AI keeps its own pick,
used whenever that AI answers, "Whichever is available" included; one not
picked answers with its first listed model. A web question on Ollama needs a
model that uses tools, so when the picked one does not, the first that does
answers those.

## Postings

While JobDekho is running it refreshes postings on its own once a day. You
can also press **Refresh now** in Settings, under Postings; running from
source, `npm run scrape` in a terminal does the same. A scrape checks around
280 sources, 8 at a time, with a 15 second timeout and one retry per source:

- company careers boards for the 262 entries in `config/companies.json`, on
  Greenhouse, Lever, Ashby, SmartRecruiters, Workable, Recruitee, Workday,
  SuccessFactors, Oracle, Eightfold and Avature;
- companies' own careers sites: Amazon, Google, Infosys, Apple, Swiggy,
  LTIMindtree, Mphasis, HDFC Bank, Coforge, Cyient, Mercedes-Benz (its
  R&D centre in India) and KPIT;
- Indian job boards: Internshala, Unstop, Instahyre, and LinkedIn's public
  job search for India (off until you turn it on, see below);
- remote boards: Remotive, RemoteOK, and Arbeitnow.

LinkedIn does not allow automated access, so it is off until you turn on
**Include LinkedIn** in Settings, under Postings. With it on, JobDekho reads
it at most once a day, slowly, and stays away for two days or more (longer
each time) if LinkedIn refuses a request.

Adzuna, an aggregator, joins every run once you paste your own free Adzuna key
into Settings (or set `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`, see
[Configuration](#configuration)). A run usually finishes in a few minutes; it
takes longer when several sources are down that day, since each is tried
twice before it is logged as failed. The corpus starts empty, so the first
scrape treats every posting it finds as new.

What is kept, and for how long:

- A posting its board says was posted more than 60 days ago is never stored.
- A posting no board has listed for 60 days is deleted by the next scrape,
  along with any stored one now posted over 60 days ago. One with no posted
  date goes only once it stops being listed, since dropping it for its age
  would only bring it straight back as new on the next scrape.
- Kept however old: a posting you saved or applied to, one an AI answered
  about (a check, a cover letter, a tailoring), and one a document was made
  for, so nothing of yours ends up pointing at a missing job. A dismissed
  posting is not kept for that.
- A posting its board has not listed for 21 days is hidden from the feed,
  since it has almost certainly closed. "Include stale postings" under More
  filters shows those again.

Running from source, `npm run scrape` prints how many were new, how many
were skipped as posted over 60 days ago, how many old ones were cleaned out,
and one line per source.

## Daily use

The feed is your recommendations: every posting gets a 0-100 percentage of
how well it matches your profile, shown on every card, and the feed runs in
grade bands, A first. **Sort** only arranges the jobs inside each grade:
Newest posted, Oldest posted, Recently added or Company A-Z. Opening a
posting shows a letter grade next to the percentage, the reasons it scored
the way it did, and a bar per dimension (skills, title, level, degree), so
the number is never just a number. With no profile to rank against, the
feed lists the newest postings and says so.

Filters across the top: Level (internship through executive), Status, Work
mode, Company, and which sources to exclude. **Company** searches every
employer in the feed with a count of its jobs; pick one or a few to see only
theirs, and the same employer spelled differently by two boards counts as
one. A company's name in an opened posting does the same for that company.
"More filters" adds a minimum pay, a ceiling on the experience a job asks
for, a ceiling on internship length, your highest degree (hiding jobs that
ask for more), and "Include stale postings". The chat can also set a fit
floor ("grade B or better"). "Save as my default" keeps those filters for
the next time you open JobDekho; the search, the companies, the status and
the fit floor last for the session.

Every posting can be marked **Saved**, **Applied**, or **Dismissed**.
Postings that look like a ghost or evergreen listing (no pay stated, a very
short description, posted a long time ago, no specific tools named, or the
same listing spread across many boards) list what raised the doubt under
"Worth a second look" when opened, and the AI's "Is it real?" check is one
click from there.

Where Dismiss puts away one job, **Block company**, beside the company's name
in an opened posting, hides every job from that company for good, under any
spelling of its name: in the feed, the company list and the chat, now and
after every refresh. When JobDekho reads a careers page of the company's own,
it asks whether to stop fetching that page as well (ticked to begin with); job
boards are still read for every other company on them, and their postings
from a blocked company are dropped. Asked to block a company, the chat offers
a button that does the same, and stops fetching its careers page too.
Settings > Blocked companies lists them, each with Unblock.

## Keyboard

The feed is a list you triage, so it is quicker from the keyboard than the
mouse.

| Key | What it does |
| --- | --- |
| `j` / `k` or arrow up and down | Move down and up the list |
| `Enter` | Open the selected job |
| `s` / `a` / `d` | Mark it saved, applied or dismissed |
| `u` | Undo the last of those |
| `Escape` | Clear the selection, or close what is open |
| `/` | Jump to the search box |
| `Cmd` or `Ctrl` + `K` | Command palette: jump, sort, filter, theme |
| `?` | Show this list in the app |

None of them fire while you are typing in a field.

Above 1100px wide a job opens in a pane beside the list; below that it opens
over it. "Rows" and "Cards" in the sort bar switch the density, and the
choice is remembered. The theme button in the top bar cycles between
following your system, light, and dark.

## Your profile

Your profile is what the ranking scores postings against: skills, target
titles, years of experience, and highest degree. On the Profile page you can
upload a resume (a PDF with a text layer, 5MB max; a scanned one has no text
to read, so type the details in instead). The upload only stores the text,
with no AI call. "Fill in from resume" then has the AI read it. On a profile
that already has something in it, pick Smart add (adds what is new, updates
what the resume has newer, skips what you already have) or Overwrite (your
sections become the resume's; each removal waits for your tick). Either way
every change arrives as a list to tick, and nothing is saved until you apply
it and press "Save profile". Or type it all in by hand.

Beside the fields that rank the feed, the profile holds what your documents
are made from: the basics (name, headline, email, phone, location, links)
and sections for experience, projects, education, certifications,
achievements, and grouped skills. "Save profile" saves it.

## Chat

"Ask AI" in the top bar opens a chat that knows which page you are on: on
Postings, the feed you are looking at and the job you have open; on Profile,
your profile and resume text; on Resume, your documents and the one that is
open; on Settings, which AIs and LaTeX were found. It suggests a few
questions for each page. An answer can name jobs from your feed, as chips
that open them, and offer buttons that change the feed. The panel floats
over the page or can be pinned to the side, and an answer still arrives if
you close it meanwhile. The conversation is saved in the data folder.

A question that needs the web (news about a company, what people say about
working there, whether it is hiring) is answered in two steps: the call that
reads your data, with no tools, only says a search is needed, and a second
call searches. The answer is marked "From the web" and lists its sources.

On the Profile and Resume pages the chat proposes changes rather than making
them: up to three profile changes a turn, or one rewrite of the open
document. Each arrives as a card ("Profile change", "Resume change", "Cover
letter change") showing what would change, with "Apply" and "Discard", and
nothing changes until you apply. A document change also lists anything in it
that is not in your profile, to check before applying, and the LaTeX guard
checks it again when you do. "Add with AI" on the Profile page opens the
chat with the start of a request already typed ("Add a project: ").

## Documents

The Resume page holds your resumes and cover letters, each a LaTeX source
that is yours to edit. "New" starts one from a template (Classic, Compact or
Academic for a resume, Letter for a cover letter), filled in from your
profile without an AI call. "Source" shows the LaTeX to edit (`Ctrl` + `S`
saves); "Preview" shows the PDF, recompiled whenever the source changes.
"PDF" and ".tex" download either.

Every save, applied chat change, header update and restore is a version;
the last 20 are kept, under "Versions", and "Restore" brings an old one back
as the newest, so nothing is lost by going back.

When your profile would now write a document's header differently (its
name, headline or contact line), the document says so and offers "Update
from profile", which changes only the header (and a letter's signature),
shown as a diff to apply, as a new version. "Keep this one" leaves that
header as it is.

Before anything compiles, a guard reads the source and refuses whatever
could read or write a file, run a command, or reach outside the document:
only known commands and packages, the article and letter classes, and links
that are https, http, mailto or tel. `pdflatex` then runs with
`-no-shell-escape`, never waiting for input, with a 60 second limit, in a
temporary folder deleted afterwards. On MiKTeX its on-the-fly package
installer is turned off for the run.

## Cover letter and tailored resume

With a job open, the chat offers three actions on it, and each saves its
answer, so reopening the job shows it again and the button becomes "Check
again", "Write again" or "Tailor again". "Change this" on a result sends the
next message as a change to that result rather than a new question.

- **Is it real?** Searches the web to check the company, the posting's URL,
  whether the pay is plausible, and scam red flags. It sends only the
  posting's own public fields and the ghost signals JobDekho computed, never
  your resume or profile. Takes a few minutes.
- **Write a cover letter.** Sends your uploaded resume text and the posting.
  The letter is editable in place, since the documents are made from it as
  it stands. "Just the letter" makes a cover letter document from it; the
  primary button makes the letter and a tailored resume together, tailoring
  first if the job has no tailoring yet.
- **Tailor my resume.** Sends your career record (the profile's sections)
  and the posting. The AI picks and orders the entries that fit the job and
  rewords the bullets it keeps. A fact check then runs in code, not by
  asking the model: any number, date, skill, employer, institute or job
  title in a reworded line that your record does not show is listed first,
  under "Check these before using it". Numbers are compared as values, so
  "1,00,000" and "100000" are the same figure. Below that, skill coverage
  against the posting before and after ("Matches 9 of 14 skills this job
  names, up from 6"), where a gain only counts if your record already showed
  that skill. "Make a resume from this" makes a Classic resume document from
  it, with the picked entries first and the rest of your record after them.

Every document made this way opens on the Resume page, tied to the job.

## Privacy and safety

What leaves this computer, and only when you ask for it:

- **AI prompts, to the AI you chose.** With Claude Code or Antigravity, the
  prompt goes to Anthropic or Google through that CLI, under your own
  account, and holds what the action needs: the resume text for Fill in from
  resume and a cover letter, your career record for a tailoring, and for a
  chat question what the page shows (the feed, your profile, the open
  document). With Ollama the prompt stays on this computer.
- **Web searches, with the question only.** Is it real? gets no resume and
  no profile, only the posting's public fields. The search step of a chat
  question gets your question, up to three earlier questions from the same
  conversation in your own words, and the open job's public fields; never
  your profile, your documents, or the earlier answers. On Claude Code the
  tools are WebSearch and WebFetch and nothing else; on Antigravity, web
  search alone; on Ollama the model runs here, and only its search queries
  and the pages it opens go out, through ollama.com under your sign-in.
- **Scraping requests to job boards.** A scrape asks each source for its
  public listings, with nothing about you in the request (beyond your own
  Adzuna key, if you turn that source on).
- **Fonts.** The web page loads its typefaces from Google Fonts.

What never leaves: the data folder itself. Your profile, resume text,
documents, chats, saved jobs and AI answers are files on this computer that
nothing uploads or syncs. There is no telemetry and nothing hosted.
Company logos are drawn as initials rather than fetched, so no logo service
learns which jobs you look at. The server listens on 127.0.0.1 only, since
anything that can reach its port can read all of this and spend your AI
subscription.

A job description is untrusted text once it has been scraped from somewhere
else. Every AI prompt that includes one fences it explicitly and tells the
model to treat it as data to read, never as instructions to follow, whatever
it says.

Fill in from resume, the cover letter, the tailoring, and every chat call
that reads your data hand the model something personal, so they all run with
no tools at all: the model can only read the prompt and answer. It cannot
browse, run a shell, or touch a file.

On Claude Code, every call, with tools or without, runs with your own hooks,
MCP servers, skills, plugins and CLAUDE.md switched off for that one call
(`--safe-mode`, `--strict-mcp-config`) and keeps no session transcript. On
Antigravity, the per-call agent has a second line behind it, in case
Antigravity ever falls back to its default agent: if
`~/.gemini/antigravity-cli/settings.json` pre-approves anything in the
command, read_file, url, browser or mcp families under `permissions.allow`,
Antigravity is reported as installed but not usable, with a sentence saying
which rules to remove, and no resume is sent to it. JobDekho reads that file
and never writes it. Either way, every call runs in a fresh, empty temporary
folder that is deleted again once the call finishes.

## Configuration

Each has a working default. Running from source, set one in `.env` at the
repo root (copy `.env.example`). The `npx` command reads no `.env` and
decides `HOST`, `PORT` and `NODE_ENV` itself; set any of the others in your
shell before running it.

| Variable | Default | What it does |
| --- | --- | --- |
| `JOBDEKHO_DATA_DIR` | `data` | Where the corpus and your own files are kept, relative to the working directory. The `npx` command uses your user data folder unless this or `--data` names another. |
| `PORT` | `3000` | Port the server listens on. |
| `HOST` | `127.0.0.1` | Address the server listens on. This computer only; anything that can reach the port can read your data. |
| `NODE_ENV` | `development` | Leave it unset on your own computer. `production` is for a deployed server: it requires `SESSION_SECRET` and turns off the local identity below. |
| `SESSION_SECRET` | `dev-insecure-secret` | Signs the session cookie. Any long random string; required in production. |
| `DEV_AUTH_USER_ID` | `local` | Every request runs as this one user id. There is no login screen; any string works. |
| `OLLAMA_HOST` | `127.0.0.1:11434` | Where Ollama's local server listens, when you moved it. Honoured only when it names this computer. |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | blank | Free registration at developer.adzuna.com. With both set, every scrape includes Adzuna. A key pasted into Settings does the same and wins over these; see `docs/adding-sources.md`. |

## Data folder

Everything lives in one folder, created on first use: your user data folder
for `npx jobdekho` (see [Quick start](#quick-start)) or the one `--data`
names, and `JOBDEKHO_DATA_DIR` (`./data` by default) when running from source. Two kinds of file live there, and they are never mixed:

| File | What it is | Safe to delete? |
| --- | --- | --- |
| `postings.ndjson` | The corpus. Rewritten whole by every scrape. | Yes. The next scrape rebuilds it, but everything in it will look new again. |
| `runs.ndjson` | One line per scrape: what ran, what failed, how many were new. | Yes, it is only a history log. |
| `profile.json` | Your profile, its sections, and the uploaded resume's text and file name. | No, it is yours. |
| `statuses.json` | Saved / applied / dismissed marks, per posting. | No. |
| `filters.json` | Your saved default filter. | No. |
| `ai-results.json` | Saved AI answers per posting: cover letters, checks, tailorings, with their recent versions. | No, each one cost a real AI call. |
| `ai-provider.json` | Which AI you picked in Settings > AI CLI, and the model for each. | No. |
| `documents.json` | Your resumes and cover letters as LaTeX, each with its last 20 versions. | No. |
| `chats.json` | Your chats: one per job and per document, comparisons and general chats, with what each holds. | Yes, if you do not need them; saved AI answers and documents stay. |
| `chat-messages.json` | Each chat's messages, the newest 200 of each. | Yes, if you do not need them. |
| `chat-history.json`, `chat-archive.json`, `*.pre-threads.json` | The chat files from before chats, read once when they moved into `chats.json`, with copies of them and of `ai-results.json` as they were then. | Yes. |
| `scrape-settings.json` | Whether the running server refreshes postings on its own once a day, and whether refreshes read LinkedIn. | Yes; it falls back to the defaults (the daily refresh on, LinkedIn off). |
| `blocked-companies.json` | The companies you blocked, when, and whether their own careers pages are still read. | Yes, if you want every one of them back. |
| `resume-selection.json` | Which template and entries the older resume builder renders. | No. |
| `resumes/` | Compiled PDFs, cached by their source. | Yes, they are rebuilt when needed. |

## Troubleshooting

Start with Settings > Setup check: it names what is missing and what to do.

**`npx jobdekho` says it needs Node.js 22.** Install the current version from
https://nodejs.org, open a new terminal, and run it again.

**"Port ... is already in use".** Leave `--port` out and the command takes
the next free port from 4747 itself, or name another one.

**The page loads but shows nothing, and the API answers 401.** `NODE_ENV` is
set to `production`, which turns off the local identity. Remove it from
`.env` or your shell and restart.

**No AI found.** Install Claude Code from https://claude.ai/code, Antigravity
from https://antigravity.google, or Ollama from https://ollama.com (and pull
a model), then press "Check again". If it is still not found, restart
JobDekho: it looks the AI up on the PATH it was started with, and an
installer that just changed PATH will not be seen until the process
restarts.

**"Not signed in" or a session that has expired.** Open a terminal, run
`claude` (`/login` if it does not prompt you automatically) or `agy` with no
arguments, and finish signing in. Then try again from the browser.

**Ollama is installed but not answering.** Start the Ollama app, or run
`ollama serve`. With no model pulled, run `ollama pull llama3.2`. To let it
search the web, run `ollama signin` and pull a model that uses tools, such
as `ollama pull qwen3:4b`. Then "Check again".

**"Is it real?" or a web question says no AI can search.** Claude Code and
Antigravity search once they run; Ollama only when signed in with a model
that uses tools (see above).

**"Antigravity is installed, but ... pre-approves tools".** Your
`~/.gemini/antigravity-cli/settings.json` has allow-rules under
`permissions.allow` that would let a headless call run commands, read
files, fetch URLs, use the browser or an MCP server. JobDekho will not send
your resume to a CLI in that state. Remove those rules, then "Check again".

**No PDF, "LaTeX is not installed on this computer".** Install MiKTeX from
https://miktex.org/download on Windows, or TeX Live elsewhere, then restart
JobDekho so it finds `pdflatex` on the new PATH. The `.tex` download works
meanwhile.

**A source fails during a scrape.** Not fatal: the run continues with
everything else. Settings, under Postings, names the sources the last
refresh could not reach, with each one's error on hover; `npm run scrape`
prints one line per source, `name: FAIL <error>`. A source that fails on
every run is usually a dead slug or an endpoint that changed shape; running
from source, see `docs/adding-sources.md`.

**A scanned PDF resume.** If the PDF has no text layer, a scan or a photo,
the upload fails with a message saying so. Type the profile in by hand
instead.

## Development

```
npm test
```

runs the whole suite once with vitest: the server, scraper, and core
packages run under plain Node, and `apps/web` runs under jsdom with React
Testing Library, in one `vitest run`.

For hot reload while working on the UI, skip the build: run `npm start` in
one terminal (it works fine with no build, it just serves no page) and

```
npm run dev:web
```

in another. Vite serves the web app and proxies `/api` and `/auth` to the
server on port 3000.

Conventions, enforced by review rather than a linter:

- ESM only, native `fetch`.
- No source file over 100 lines. Test files are exempt.
- One responsibility per file. No `utils`, `lib`, or `common` catch-alls.
- Hyphens only, in code, comments, and copy. No em dashes.
- Comments explain why, not what.
- Every source adapter gets a fixture test, so a silent upstream shape change
  becomes a failing test instead of an empty run.

Adding a new job source is covered in
[docs/adding-sources.md](docs/adding-sources.md).

### Publishing to npm

```
npm run pack:npm
```

builds the web app and stages the npm package `jobdekho` in `dist/npm`: the
folders the command runs, each where it sits in the repo, with every
`@jobdekho/...` import rewritten to a relative path, and a package.json that
lists every library they import. It stops if an import would not resolve once
installed. `npm run pack:npm -- --tgz` also packs
`dist/jobdekho-<version>.tgz`, which `npx ./dist/jobdekho-<version>.tgz` runs
the way a user would.

A release is `npm version patch` (or `minor`), which bumps the version,
commits and tags it, then `npm run pack:npm` and `npm publish ./dist/npm`, and
`git push --follow-tags`. To let testers try a version first, publish it
with `--tag next` (they run `npx jobdekho@next`), then move it to everyone
with `npm dist-tag add jobdekho@<version> latest`.

## License

MIT, see [LICENSE](LICENSE).
