# Adding job sources

Everything JobDekho scrapes comes from an **adapter**. This is the guide to adding more of them.

Read the tiers below in order. Most of the time the answer is tier 1, which is a one line
change and no code at all.

---

## The three tiers, cheapest first

### Tier 1: the company uses an ATS we already support

Cost: **one line in `config/companies.json`.** No code, no test, no deploy risk.

We already speak twelve multi-tenant ATS platforms:

| provider | endpoint we call |
| --- | --- |
| `greenhouse` | `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true` |
| `lever` | `https://api.lever.co/v0/postings/{slug}?mode=json` |
| `ashby` | `https://api.ashbyhq.com/posting-api/job-board/{slug}` |
| `smartrecruiters` | `https://api.smartrecruiters.com/v1/companies/{slug}/postings?limit=100` |
| `workable` | `https://apply.workable.com/api/v1/widget/accounts/{slug}?details=true` |
| `recruitee` | `https://{slug}.recruitee.com/api/offers/` |
| `personio` | `https://{slug}.jobs.personio.de/search.json` |
| `workday` | `POST https://{tenant}.{wdN}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs`, see below |
| `successfactors` | `GET {careers site}/search/?q=&locationsearch=India&sortColumn=referencedate&sortDirection=desc&startrow={n}`, see below |
| `oracle` | `GET https://{pod}.fa.{dc}.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions`, see below |
| `eightfold` | `GET {careers site}/api/pcsx/search?domain={domain}&location=India&sort_by=timestamp`, or the older `/api/apply/v2/jobs`, see below |
| `avature` | `GET {portal}/SearchJobs/` with the portal's own India filter, see below |
`personio` is wired up and tested but has no entries in `config/companies.json` yet. Its tenants
are overwhelmingly German companies hiring locally, and `packages/core/src/filter.js` drops
foreign-region-locked roles, so the boards found so far would contribute nothing but requests.
The provider is there for when a tenant worth having turns up.

Add the company to the `providers` array:

```json
{ "provider": "greenhouse", "slug": "databricks" }
```

That is the whole change. The next run picks it up.

**Before you commit, check the slug is real.** A wrong slug is not fatal, the runner logs a
per-source failure and keeps going, but a long tail of dead sources makes the run slow and
the logs useless. Just call the endpoint:

```bash
curl -s "https://boards-api.greenhouse.io/v1/boards/databricks/jobs?content=false" | head -c 300
```

A 404 means the slug is wrong. A 200 with jobs means you are done.

> Careful with SmartRecruiters and Workable: both return **HTTP 200 with an empty list** for a
> company that does not exist, instead of 404. For those two, "it returned 200" proves nothing.
> Only a non-zero job count proves the slug is real.

SmartRecruiters slugs are also **case sensitive**: `Freshworks` works, `freshworks` does not.

An entry may carry `tags`, which go on every posting its board sends (`packages/sources/src/tagged.js`),
beside the board's own. Y Combinator companies carry their batch, `"tags": ["YC W21"]`, and the
feed shows those postings with a small YC chip. A Greenhouse, Lever or Ashby entry may also give
`company` where the slug is not the name (`ashby:atomic-invest` is Atomic).

**Y Combinator companies** are found by a maintainer-only script, never by a run:
`node apps/scraper/scripts/yc/main.js --out yc-candidates.json`, and `--apply` to write what it
found into this file. YC's terms of use forbid robots and scraping on ycombinator.com and its
subdomains, and Work at a Startup shows a logged-out visitor 30 of its jobs and the rest only
through a search key minted per visit, so neither is read at all. The script reads yc-oss's
mirror of YC's directory instead (`https://yc-oss.github.io/api/companies/hiring.json`), keeps the
companies based in India or fully remote, looks on each company's own website for a board
JobDekho already reads, and keeps a board only when its own API answers with at least one posting
`config/filters.json` keeps. One request at a time per host, three seconds apart, only where
robots.txt allows, and a challenge page counts as a no. A robots.txt answered with a plain 401 or
403 is no robots.txt at all (RFC 9309), which is how Ashby's API host answers; a 429, a 5xx or a
challenge there keeps the host out.

### Workday boards

A Workday company is one entry too, but it takes the careers site URL instead of a slug. A
Workday board is addressed by three values that have to agree, the tenant, the `wdN` data centre
and the site name, and the URL a person copies from the address bar carries all three:

```json
{ "provider": "workday", "url": "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite", "company": "NVIDIA" }
```

- `url` is the company's job list as the browser shows it, with or without a locale segment such
  as `/en-US/`. The shared-host form `https://wd3.myworkdaysite.com/recruiting/{tenant}/{site}`
  works too (Magna and Mondelez use it).
- `company` is the name shown on every posting. Write it out: the tenant is often an abbreviation
  (`wf` is Wells Fargo, `mmc` is Marsh McLennan, `hcmportal` is UPS), and the payload names only
  a legal entity ("IN01 NVIDIA Graphics Bengaluru").
- `slug` is optional and only names the source, `workday:{slug}`, defaulting to the tenant. Set it
  when two sites on one tenant are both configured (FedEx and Houlihan Lokey are), because the
  source name is part of every posting's id and two sources must never share one.

Check a board before adding it with the same request the adapter makes first:

```bash
curl -s -X POST 'https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs' \
  -H 'Content-Type: application/json' \
  -d '{"appliedFacets":{},"limit":1,"offset":0,"searchText":""}'
```

Look in `facets` for a value whose descriptor is `India`, and at its count. As with
SmartRecruiters, a 200 proves little: a retired site answers 200 with `total: 0` and no facets
(Qualcomm's `wd12` site did), and a tenant asked on the wrong data centre answers 422. Only an
India count proves the board is worth a line.

What the adapter (`packages/sources/src/providers/workday*.js`) does on each run:

1. **Narrows to India the way the careers site does**, with Workday's own location facet read
   from that first response rather than free text. `searchText: "India"` would also match a US
   role that mentions the Bengaluru team. The facet's name and ids differ per tenant
   (`locationCountry`, `Location_Country`, `Country`, `locationHierarchy1`, a custom
   `CF_-_REC_-...` at Salesforce, a bare `a` at Red Hat), so the facet is found by its value
   `India`, and when two facets carry that value the fuller one wins. Tenants with no country
   facet (Cisco, Barclays, Micron, HPE and a dozen more) get every Indian city in their
   `locations` facet selected instead, with "Indiana", "Delhi, Ohio" and Hyderabad, Pakistan kept
   out and office codes such as FIS's `IND BNGL FL2-3 TWR 3` kept in. Only a site with neither
   falls back to searching for "India".
2. **Lists up to 100 postings, newest first**: five pages of 20, a 250 ms pause before each.
3. **Picks which of them need a detail call**, using the context the runner passes to
   `fetch(http, context)` (built in `apps/scraper/src/scrape.js`). A posting whose body the store
   already holds (`context.known`) is skipped: it needs no second call, and it is left out of the
   run so its stored location list, date and body stand. A posting the relevance filter would drop
   (`context.wanted`, judged on the title, since the body is not read yet) is skipped too; it is
   never stored, so without this it would be fetched again on every run. At most 40 remain per
   run; the rest are picked up by the runs that follow. Without a context every listed row is a
   candidate, newest first, up to the same 40.
4. **Fetches those postings' detail**, `GET .../wday/cxs/{tenant}/{site}{externalPath}`, two at a
   time. The list carries no body, and where a role is in several cities it says only
   "3 Locations"; the detail has the body, every location and the exact `startDate`.
5. **Returns only the postings whose detail arrived.** One sent without it would reach the store
   as "3 Locations" with no body and a guessed date. If every detail call fails, the source
   reports an error rather than an empty board.
6. **Stops sending to a host that answers 429** for the rest of the run, keeps what it read, and
   says so in the run's `note`.

`postedOn` in the list is prose ("Posted Today", "Posted 3 Days Ago", "Posted 30+ Days Ago"). The
detail's `startDate` replaces it. When a detail has none the prose is read, and "30+" counts as 30
days: a true lower bound, which sorts a month-old role behind this week's and can never push a
posting past the 60-day cut in `packages/core/src/freshness.js`. Only a real date should do that.

Cost per company per run: one facet request, up to five list pages, and detail calls only for new,
relevant postings, at most 40. The first run after adding a board pays for the whole backlog, 40 at
a time. After that a quiet board costs **one request**: the run's source memo
(`apps/scraper/src/source-memo.js`, `workday-memo.js`) remembers the tenant's India facets and how
many postings its last full read listed, so no facet probe is sent, and when the first page holds
only postings the store already has and the count has not moved, no further page is read either;
every posting that last full read listed counts as seen again (`context.unchanged`). Facets and
count are read afresh at least weekly, and a remembered facet that stops working is probed again at
once. That also means a Workday source reporting 0 postings is normal on a quiet day. A dead board
fails its first page and reports an error instead. `MAX_POSTINGS` in `workday-list.js` and
`MAX_DETAILS` in `workday-select.js` are the levers.

### SuccessFactors boards

A company on SAP SuccessFactors' Career Site Builder is one entry with its careers site URL:
`{ "provider": "successfactors", "url": "https://careers.ey.com/ey/", "company": "EY", "slug": "ey" }`.
`url` is the site's home page, or its brand root when job links carry one (EY's sit under `/ey/`);
a copied search or job URL works too. Only the classic template can be read. Its search page and
job pages are rendered on the server, and robots.txt allows both.

The adapter (`packages/sources/src/providers/successfactors*.js`) lists India with the site's own
location search, newest first, up to 100 rows over at most 5 pages. It reads at most 40 new, wanted
job pages per run, one request at a time 500 ms apart, and takes title, date, every place and the
body from each page's schema.org JobPosting data. A 429 stops the board for the run.

Two shapes cannot be read and are refused with a clear error. **Unify** sites (the body class
contains `unify`: Wipro, HCLTech, BT and Standard Chartered in September 2026) draw their jobs in
the browser from `/services/recruiting/v1/jobs`, which every CSB robots.txt disallows. The old
`career<N>.successfactors.com` and `sapsf` pages are `Disallow: /` outright. To check a board:

```bash
curl -s '{url}/search/?q=&locationsearch=India&sortColumn=referencedate&sortDirection=desc&startrow=0' \
  | grep -oE 'Results <b>[^<]*</b> of <b>[0-9,]+</b>|of [0-9]+ Jobs|<body class="[^"]*"'
```

A count means it is readable; `unify` in the body class means it is not.

### Oracle Recruiting Cloud boards

One entry per company:
`{ "provider": "oracle", "url": "https://careers.ti.com/en/sites/CX", "company": "Texas Instruments", "slug": "ti" }`.
`url` is the job site as the browser shows it, on the company's domain or on
`{pod}.fa.{dc}.oraclecloud.com/hcmUI/CandidateExperience/en/sites/{site}`. Neither form reliably
names what the API needs: a company domain fronts an oraclecloud.com host, and the site name in the
path is often a code the API rejects (Honeywell's `Honeywell` is site number `CX_1`, Oceaneering's
`jobs` is `CX_3001`). So every run first reads the page and takes the API host and site number from
its `<base>` tag (`data-apibaseurl`, `data-sitenumber`), following it only to an
`https://*.oraclecloud.com` host. `slug` is required: the host names an Oracle pod (`edbz`,
`fa-ewjt-saasfaprod1`) and the site number is `CX_1` almost everywhere, so neither can name the
source `oracle:{slug}`.

To check a board, find those two attributes in the page source, then ask
`{api}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&finder=findReqs;siteNumber={site},facetsList=LOCATIONS,limit=1`
and look for `India` and its `TotalCount` in `items[0].locationsFacet`. The facet lists only a
site's busiest places, ten on most sites, so a US-heavy board may leave India out even when it hires
there (Oracle's own did). The adapter then asks
`recruitingCESearchAutoSuggestions?onlyData=true&finder=findByLoc;string=India` instead.

Each run (`packages/sources/src/providers/oracle*.js`) reads the page, finds India's location id
(it differs per pod), lists up to 100 postings newest first (four pages of 25, 250 ms apart), skips
known and unwanted postings as Workday does, and fetches at most 40 details, two at a time. The body
is the description, responsibilities and qualifications; the legal blocks every posting repeats are
left out. `ExternalPostedStartDate` dates the posting, and the workplace code (`ORA_HYBRID`,
`ORA_REMOTE`, `ORA_ON_SITE`) becomes a tag. A 429 stops the board with a `note`.

### Eightfold boards

An Eightfold company is one entry:
`{ "provider": "eightfold", "url": "https://careers.qualcomm.com/careers", "domain": "qualcomm.com", "company": "Qualcomm", "slug": "qualcomm" }`.
The site is either the company's own host or `{tenant}.eightfold.ai`. `domain` is the one the page
names in its hidden `pcsx-data` block (view the source and search for `&#34;domain&#34;`); the host
does not always give it away, since mlp.eightfold.ai is mlp.com.

Eightfold runs two APIs. PCSX is `/api/pcsx/search?domain=D&query=&location=India&start=N&sort_by=timestamp`
with `/api/pcsx/position_details?position_id=ID&domain=D`. The older one is
`/api/apply/v2/jobs?domain=D&location=India&start=N&num=10&sort_by=timestamp` with
`/api/apply/v2/jobs/ID?domain=D`. Each answers 403 on a site that runs the other, and the adapter
tries PCSX first. Both return ten positions a request whatever is asked. A run lists up to 100
postings, fetches bodies one at a time for at most 40 new, relevant ones, pauses 400 ms between
requests, and stops the host on a 429 with a `note`. eaton.eightfold.ai answered 429 to the very
first request, so it is left out for now.

### Avature portals

An Avature company is one entry with the portal's job list URL, India ticked in the site's own
country filter:
`{ "provider": "avature", "url": "https://jobs.ea.com/en_US/careers/SearchJobs/?8171%5B0%5D=10590&listFilterMode=1", "company": "Electronic Arts", "slug": "ea" }`.
The field and option ids belong to the tenant. To find India's id, look in the page source for the
country field's datasource settings and make the one POST its filter box makes, to
`{portal}/_wizardPortalDatasetSingleColumnOptionsSearchApi` with search text "India". A portal that
lists only India (Deloitte USI) needs no filter.

The adapter reads the HTML list in the site's own order (newest first) and follows its own
pagination, up to ten pages and 100 postings. It then reads at most 40 new posting pages, one every
500 ms, taking the schema.org JobPosting where the portal has one, and the labelled location and
posted fields otherwise. The RSS feed (`SearchJobs/feed/`) is not used: it lists oldest first and
carries no place. A portal behind an AWS WAF challenge (IBM answers 202 with
`x-amzn-waf-action: challenge`) fails as a refusal and is not worked around.

### Tier 2: a new multi-tenant ATS

Cost: **one new provider file**, roughly 40 lines, plus a fixture test.

This is the highest leverage work in the whole repo. One file unlocks *every company on that
platform* forever, and each of those companies is then a tier 1 one-liner. Adding Workable took
about 40 lines and made every Workable customer reachable.

Do this when you notice the same unfamiliar ATS domain showing up on three or four careers pages
you wanted.

Steps:

1. Create `packages/sources/src/providers/<name>.js` (template below).
2. Register it in `packages/sources/src/registry.js`, in the `PROVIDERS` map.
3. Add `packages/sources/test/<name>.test.js` with an inline fixture.
4. Add real slugs to `config/companies.json`.

### Tier 3: a bespoke site with no shared ATS

Cost: **a new board adapter**, and ongoing maintenance forever.

Some sites have no ATS behind them, or run their own. These live in
`packages/sources/src/boards/` (see `internshala.js`, `unstop.js`). Unlike a
tier 1 or 2 provider, a board adapter takes no `slug`: it is one adapter for
one site, registered by name in the `boards` array in `config/companies.json`
(`"internshala"`, `"unstop"`, and so on) and in the `BOARDS` map in
`registry.js`, the same way a provider is registered in `PROVIDERS`.

`packages/sources/src/companies/` holds single-company adapters, for a company whose own careers
site no provider above covers. They are wired through a separate `companies` array in
`config/companies.json` and a `COMPANIES` map in `registry.js`. Shared helpers are
`portal-polite.js` (a 1 second pause between requests; a 429 stops that host, keeping what was read
with a `note`), `portal-describe.js` (detail pages for at most 40 new, wanted postings) and
`portal-text.js`. The ones whose list carries no date (Apple, RippleHire) return only
postings they have just described, as Workday does, since sending a known one again without its
date would wipe the stored one.

- **amazon.js** reads amazon.jobs' own `search.json`, narrowed with `normalized_country_code[]=IND`,
  the filter the site's country checkbox sends: the `loc_query=India` it used to send is ignored by
  the search, which answered 10000 jobs worldwide with 8 of the first 100 in India. It reads five
  pages of 100, newest first.
- **google.js** reads the first page of Google's server-rendered results
  (`/about/careers/applications/jobs/results?location=India&sort_by=date`), where each job is
  embedded whole in an `AF_initDataCallback` payload. robots.txt disallows `results?*&page=` for
  every agent, so only that page is read: the 20 India postings most recently published. On
  2026-09-30 those spanned 20 hours, so a daily run keeps up. `feed.xml` is not used: 20 MB
  worldwide, with no India filter.
- **infosys.js** makes one request to the search the site calls without auth,
  `getCareerSearchJobs?sourceId=1,21&searchText=ALL`. 1 and 21 are the site's India lists (lateral
  and fresher, from its `sourcelist.json`). It returns every India posting with the full text,
  about 6.5 MB.
- **apple.js** reads `jobs.apple.com/en-in/search?location=india-INDC&sort=newest`, five pages of 20,
  from the data embedded in each page. Detail pages supply the qualifications, for up to 40 new
  wanted postings.
- **swiggy.js** makes one POST to the MyNextHire board that `careers.swiggy.com` embeds
  (`reqlist/get`). It returns every open role with its description.
- **ltimindtree.js, mphasis.js, hdfcbank.js** share `ripplehire.js`. Each is a RippleHire career
  site named by the token in the company's public careers link: two search pages of 50, newest
  first, then `candidatejobdetail` for up to 40 new wanted postings. LTIMindtree uses the site's
  `geo=India`, Mphasis keeps `jobLocation` "IND", and HDFC Bank is India-only. If a token is ever
  rotated, the new one is in the company's careers link.
- **coforge.js, cyient.js** share `zwayam.js`. Each is one POST per page to
  `public.zwayam.com/jobs/search`, with the site's domain and company id and its own Country facet
  set to India: 10 postings a page, up to 12 pages, bodies included. Zwayam cuts
  `mediumDescription` at 300 characters, so the adapter takes whichever description field holds
  the most text.

Microsoft and EY are read through their platforms (Eightfold and SuccessFactors) rather than an
adapter of their own. Some careers sites cannot be read without getting around a block, so they
stay out: TCS (an Akamai 403 on every page), Cognizant (Cloudflare answers 403 to Node's own fetch, though not to curl), Flipkart and Ola (TurboHire, whose API needs a token
minted per visitor), Tech Mahindra and Reliance Jio (ASP.NET postbacks tied to a page session),
ICICI Bank (a bearer token on every call) and IBM (an AWS WAF challenge). For a new bespoke source,
copy `boards/`.

Two sub-cases, very different in price:

- **The page is server rendered, or there is a JSON endpoint behind it.** Parse the HTML with
  `cheerio`, or better, call the JSON directly. This is fine. `unstop.js` calls a JSON API,
  `internshala.js` parses HTML.
- **The page is JavaScript rendered.** `fetch` gets you an empty shell, because the listings are
  drawn client side. You would need a headless browser (Playwright/Puppeteer) in the scraper.
  That means a browser binary in CI, much slower runs, and far more breakage. **This is the
  expensive last resort.** Exhaust tiers 1 and 2 first, and check for a hidden JSON endpoint
  (next section) before you accept that a site really needs a browser.

A quick way to tell: `curl` the page and count the bytes. If the HTML is 5 KB and contains no
job titles, it is JS rendered.

---

## Working out which ATS a company uses

Open the company's careers page and look at where the **Apply** link goes. The domain gives it
away immediately:

| domain you see | provider | slug is |
| --- | --- | --- |
| `boards.greenhouse.io/acme` or `job-boards.greenhouse.io/acme` | `greenhouse` | `acme` |
| `jobs.lever.co/acme` | `lever` | `acme` |
| `jobs.ashbyhq.com/acme` | `ashby` | `acme` |
| `apply.workable.com/acme` | `workable` | `acme` |
| `acme.recruitee.com` or a custom domain proxying it | `recruitee` | `acme` |
| `jobs.smartrecruiters.com/Acme` | `smartrecruiters` | `Acme` |
| `acme.jobs.personio.de` | `personio` | `acme` |
| `acme.wd5.myworkdayjobs.com/Careers` or `wd3.myworkdaysite.com/recruiting/acme/Careers` | `workday` | no slug: the whole URL, see "Workday boards" |
| a careers page whose `<body class="coreCSB ...">` | `successfactors` | the site URL plus a slug, see "SuccessFactors boards" |
| `{pod}.fa.{dc}.oraclecloud.com/hcmUI/CandidateExperience/en/sites/{site}`, or a page with `data-apibaseurl` | `oracle` | the site URL plus a slug, see "Oracle Recruiting Cloud boards" |
| `{tenant}.eightfold.ai/careers`, or a careers page with a `pcsx-data` block | `eightfold` | the site URL, its domain and a slug, see "Eightfold boards" |
| `{host}/en_US/{portal}/SearchJobs` | `avature` | the SearchJobs URL plus a slug, see "Avature portals" |
| `acme.darwinbox.in` | Darwinbox, not yet supported | see below |

The slug is nearly always the path segment or the subdomain right there in the URL.

You do not have to click around by hand. Fetch the careers page and grep it:

```bash
curl -sL https://razorpay.com/jobs/ \
  | grep -oE '(boards|job-boards)\.greenhouse\.io/[a-z0-9_-]+|jobs\.lever\.co/[a-z0-9_-]+|jobs\.ashbyhq\.com/[a-z0-9._-]+|apply\.workable\.com/[a-z0-9_-]+|[a-z0-9-]+\.recruitee\.com|[a-z0-9-]+\.myworkdayjobs\.com|[a-z0-9-]+\.fa\.[a-z0-9.]*oraclecloud\.com|[a-z0-9-]+\.eightfold\.ai' \
  | sort -u
```

That is exactly how the current list was built. It found, for example, that Razorpay is on
Greenhouse under `razorpaysoftwareprivatelimited`, Freshworks is on SmartRecruiters under
`Freshworks`, and apna is on Workable under `apna`. None of those slugs are guessable.

**Do not guess slugs from company names.** The hit rate is poor. Detecting from the careers page
is both faster and correct.

---

## Finding the JSON endpoint behind a careers page

When the ATS is one we do not support yet, or the site is bespoke, find the API the page itself
is calling. You almost never need to parse HTML.

1. Open the careers page in Chrome and press F12.
2. Go to the **Network** tab and filter to **Fetch/XHR**.
3. Reload the page.
4. Look for a request whose response contains the job titles. It is usually the largest JSON
   response on the page, and the path usually says `jobs`, `postings`, `offers`, `search`,
   or `careers`.
5. Right click it, **Copy > Copy as cURL**, and run it in a terminal with the headers stripped
   off one at a time. Usually everything except the URL can go. If it still returns JSON with
   no cookie and no auth header, it is a public endpoint and you can use it.
6. Note where the company identifier appears in that URL. That is your `slug`.

If the endpoint needs a session cookie, an API key, or a signed token, stop. It is not a public
endpoint, and using it is a different conversation than scraping a public job board.

---

## The adapter contract

An **Adapter** is:

```js
{ name: string, fetch(http, context) -> Promise<RawPosting[]> }
```

`http` is injected (`packages/sources/src/http.js`). It sets a User-Agent, applies a 15 second
timeout, and **throws on any non-2xx**. Never import `fetch` directly in an adapter, and never
let a test make a real network call.

`context` is optional, and only an adapter that pays a second request per posting needs it (the
Workday provider and LinkedIn's job views do). `context.known(name, externalId)` says the store
already holds that posting's body; `context.wanted(name, raw)` says the relevance filter would
keep a raw posting. An adapter must still work when `context` is absent.

A **RawPosting** is:

```js
{
  externalId,        // string, stable and unique within this source
  title,             // string
  company,           // string
  location,          // string, optional
  url,               // string, the public posting page
  description,       // string, PLAIN TEXT, optional but strongly wanted
  tags,              // string[], optional
  postedAt,          // ISO 8601 string or null, optional
  level,             // optional, see below
  stipend, duration, experience,  // optional, mostly for the Indian intern boards
}
```

Two fields deserve care.

**`description` must be plain text, and it matters more than it looks.** The degree classifier
in `packages/core/src/degree.js` reads degree requirements out of the body. If you pass an empty
description, every posting from that source silently reports "no degree requirement". That is
not a visible failure, it is a wrong answer. Use `stripHtml` from `packages/sources/src/html.js`.

This exact bug shipped: the Greenhouse adapter requested `?content=false`, so 20 boards produced
empty bodies and degree detection was dead across all of them. Nothing failed, the numbers were
just wrong.

**`level` must only be set when the source genuinely knows.** Valid values are
`internship`, `entry`, `mid`, `senior`, `staff`, `executive` (see `packages/core/src/level.js`).
A value you set **overrides** the title based classifier, so a wrong one is worse than none.

In practice the only trustworthy signal is an explicit internship employment type: Lever's
`categories.commitment === 'Internship'`, Workable's `employment_type === 'Internship'`,
Personio's `"Intern / Student"`. Those go through `internLevel()` in
`packages/sources/src/providers/employment-type.js`. Recruiter chosen seniority pickers
(SmartRecruiters' `mid_senior_level`, Recruitee's `experience_code`) are frequently left at
defaults, so we ignore them and let the title decide.

**Do not set `type`.** It used to be hardcoded to `'job'` on the ATS providers, which meant a
posting titled "Software Engineering Intern" could never classify as an internship.
`packages/core/src/normalize.js` now derives `type` from `level`. Leave it alone.

### Minimal provider template

Copy this into `packages/sources/src/providers/<name>.js`:

```js
import { stripHtml } from '../html.js'
import { internLevel } from './employment-type.js'
import { toIso } from '../iso-date.js'

export function myats({ slug }) {
  return {
    name: `myats:${slug}`,
    async fetch(http) {
      const res = await http(`https://api.myats.com/v1/boards/${slug}/jobs`)
      const data = await res.json()
      return (data.jobs || []).map((j) => ({
        externalId: String(j.id),
        title: j.title || '',
        company: data.company?.name || slug,
        location: j.location?.name || '',
        url: j.url || j.applyUrl || '',
        description: stripHtml(j.descriptionHtml || j.description),
        tags: [j.department, j.team].filter(Boolean),
        postedAt: toIso(j.publishedAt),
        ...internLevel(j.employmentType),
      }))
    },
  }
}
```

Then in `packages/sources/src/registry.js`:

```js
import { myats } from './providers/myats.js'
const PROVIDERS = { greenhouse, lever, ashby, smartrecruiters, workable, recruitee, personio, workday, myats }
```

### House rules for adapters

- **Be defensive about every field.** Use optional chaining and fallbacks so an upstream shape
  change degrades to a missing field, never a thrown error. `(data.jobs || [])` and
  `j.location?.name || ''` are the pattern. One provider throwing must not lose the other 79.
- **If your adapter pages, wrap each page in try/catch.** One bad page must not abort the rest.
  See `internshala.js` and `unstop.js`:

  ```js
  for (const url of pages) {
    try {
      const res = await http(url)
      out.push(...parse(await res.text()))
    } catch {
      // skip a failed page; the rest still run
    }
  }
  ```

- **No source file over 100 lines.** Split by concern if you approach it. No `utils.js`,
  `lib.js`, or `common.js` catch-alls. Test files are exempt.
- **ESM, no semicolons, no TypeScript** in `packages/**`. Match the surrounding style.
- **Comments only where they state a constraint the code cannot show.** "why content=true is
  mandatory" is a good comment. "map jobs to postings" is not.
- **Hyphens, not em dashes**, everywhere.

---

## Why every adapter gets a fixture test

Because these APIs are undocumented and change without warning.

If `descriptionPlain` gets renamed, or `content` moves under `jobAd`, the adapter does not crash.
It happily returns 200 postings with empty bodies, forever, and nobody notices. Silence is the
failure mode, which is exactly the kind of bug a test is for.

A fixture test freezes the shape you actually observed. When upstream changes, you get a **red
test** instead of a quiet empty run.

Style: an inline fixture object plus a fake `http`. **Never a real network call.**

```js
import { describe, it, expect } from 'vitest'
import { myats } from '@jobdekho/sources/providers/myats.js'

const fixture = { jobs: [{ id: 5, title: 'Backend Engineer', descriptionHtml: '<p>Build &amp; ship</p>' }] }
const http = async () => ({ json: async () => fixture })

describe('myats adapter', () => {
  it('names itself by slug', () => {
    expect(myats({ slug: 'acme' }).name).toBe('myats:acme')
  })
  it('maps jobs to RawPosting', async () => {
    const [r] = await myats({ slug: 'acme' }).fetch(http)
    expect(r.externalId).toBe('5')
    expect(r.description).toContain('Build & ship')
  })
})
```

Build the fixture from a **real response** you captured with `curl`, trimmed down. Do not invent
field names, that defeats the point.

Worth asserting, beyond the happy path:

- the empty payload (`{}`) returns `[]` rather than throwing
- `description` comes out with no HTML tags in it
- `level` is **undefined** for an ordinary role, and `'internship'` for an intern one

Run them with:

```bash
npx vitest run packages/sources
```

---

## Naukri, LinkedIn, and the "log in and scrape it" idea

The tempting shortcut is to sign into a big job site with your own account and have the scraper
reuse that session, on the reasoning that being logged in makes the access legitimate. It does not.
Logging in is the opposite: it means you accepted a terms-of-service document that almost always
forbids automated collection, so an authenticated scraper is a clearer violation than an anonymous
one, not a safer one. The practical consequences land on you rather than on the code:

- The account doing the scraping is the one that gets rate limited, then suspended. On Naukri that
  is the same profile recruiters contact you through.
- Session cookies for these sites are bearer credentials. Storing one in `.env` so a scheduled scrape
  can replay it means a leak hands over your whole account.
- Sessions are short lived and bot detection is aggressive. The scraper breaks constantly, and every
  fix is another round of evasion.

None of the big Indian boards offer a public job-seeker API. Naukri's API is for employers posting
jobs, LinkedIn's Jobs API is partner-only, and Indeed closed its publisher API to new applicants.
Asking for access as an individual will not succeed.

"No API" is not the same as "no public endpoint", though, and the two sites in this heading have
gone different ways:

- **LinkedIn has an adapter**, `packages/sources/src/boards/linkedin.js`, and it contradicts
  nothing above. It calls two endpoints LinkedIn's own logged-out pages use:
  `jobs-guest/jobs/api/seeMoreJobPostings/search`, which loads more search cards, and
  `jobs-guest/jobs/api/jobPosting/{id}`, the guest view of one posting. No account is involved,
  no cookie, no token, and no bot check is being defeated: a plain `fetch` gets exactly what a
  visitor without an account is shown. The warning about logged-in scraping stands in full. This
  is not that.

  A search card carries title, company, location, link and posting date, ten per page, and no
  body. One run does this (the files are `linkedin-plan.js`, `linkedin-sweep.js`,
  `linkedin-job.js` and `linkedin-polite.js` beside the adapter):

  - **A sweep of search pages.** 14 terms, each a role family plus a level: software engineer,
    frontend, backend, web, data science, data analyst, machine learning, AI engineer, devops,
    android, software testing and product manager internships, and "fresher software engineer"
    and "associate software engineer" for entry level. India. Page 0 of every term before page 1
    of any, a term stopping at a page that adds nothing the run has not seen, and cards deduped
    by posting id across terms. Two sizes (`FIRST_SWEEP` and `DAILY_SWEEP` in
    `linkedin-plan.js`, chosen by the guard below):
    - the **first sweep** looks back a month (`f_TPR=r2592000`) with at most **60 search
      requests** (14 terms 4 deep, the first four a fifth) and **40** guest views;
    - **every later sweep** looks back a week (`f_TPR=r604800`), since sweeps come about daily,
      with at most **35 search requests** (14 terms 2 deep, the first seven a third) and **25**
      guest views. Over a week "software engineer intern" was still 9 of 10 relevant at start=50,
      and 7 of the week's first 10 cards were not on the month's first page, so a week's new
      postings sit in its first pages; views scale with the pages read (40 for 60). After a gap
      longer than six days a sweep looks back a month again, still at the daily size.
  - **Descriptions for new postings.** Up to the sweep's cap of guest views, read with `stripHtml`.
    The criteria list's Employment type of "Internship" sets `level`; the Seniority level picker
    is ignored (it said Internship on a posting whose employment type was Temporary). The scraper
    may pass `fetch(http, { known, wanted })`: `known(source, externalId)` skips a posting the
    store already has a body for, `wanted(source, raw)` skips a card its filter would drop.
    Without them every card is a candidate, in the order found, up to the cap.
  - **The apply link stays LinkedIn's.** None of the four guest views sampled carried the
    company's own apply address: each showed an offsite Apply button that opens a sign-in prompt,
    with no address anywhere in the page. Older guest pages kept it in a hidden
    `<code id="applyUrl">`; that is still read if it comes back, and only an http(s) address off
    linkedin.com replaces the card's link.
  - **Paced, and it stops when told to.** 2 to 4 seconds, jittered, between any two requests, so
    a daily sweep of at most 60 requests takes two to four minutes alongside the other sources.
    On HTTP 429, LinkedIn's own 999, or a redirect to a sign-in page, the whole LinkedIn run
    stops at once and returns what it had, with the reason in `adapter.note`; if it had nothing,
    the source fails with that reason and the runner's retry does not reach LinkedIn. It never
    retries harder, never changes headers or identity, and never uses a cookie or a login.
    `adapter.outcome` is `{ answered, refusal }`: how many requests LinkedIn answered (any HTTP
    status; a network failure is not an answer) and the refusal, `{ reason, retryAfterMs }`,
    where `retryAfterMs` comes from a `Retry-After` header (seconds or an HTTP date; `http.js`
    keeps the header on the error it throws as `err.retryAfter`).
  - **A guard across runs** (`apps/scraper/src/linkedin-guard.js`, pure rules with the clock
    passed in, and `linkedin-turn.js`, which applies them inside `runScrape`, so `npm run
    scrape`, "Refresh postings" and the daily auto refresh all obey it). Nothing can promise
    LinkedIn will not block an address, since its terms do not allow automated access; the guard
    keeps JobDekho looking like one person browsing. Its state is `linkedin-guard.json` in the
    data folder, `{ lastSweepAt, pausedUntil, refusals }`, one record for the computer rather
    than one per user, since LinkedIn limits the address:
    - **At most one sweep per 20 hours**, however many refreshes run. A refresh inside the
      window sends LinkedIn nothing, and its run result lists LinkedIn as skipped (`skipped:
      true`, `ok: true`) with a note such as "LinkedIn read 5 h ago; next after 15 h", which the
      app shows quietly rather than as a failure. The read is claimed before the first request,
      so a second scrape started meanwhile skips it too.
    - **A refused sweep pauses LinkedIn** for 48 hours, doubling with each refusal in a row (2,
      4, 8 days) to 14 days at most, and never shorter than a `Retry-After` LinkedIn sent. A
      paused refresh sends nothing. A clean sweep sets the refusal count back to 0.
    - **A sweep that reached nothing** (every request failed before LinkedIn answered: the
      computer was offline) leaves the guard as it was, so the first sweep's month is not spent
      on a dead connection.
    - **"Include LinkedIn"** in Settings (`linkedin` beside `autoRefresh` in
      `scrape-settings.json`, off by default, since LinkedIn does not allow automated access)
      decides whether it runs at all: off means no request of any kind, and the guard is not
      touched. Settings shows where the guard stands: "Read 5 h ago, next after
      15 h", "Paused until Fri 3 Oct: LinkedIn refused the last read", or "Off".

  What was measured on 2026-09-30 to choose this, 36 single requests 3 to 6 seconds apart, none
  refused:

  - **`f_E` is ignored by this endpoint.** `f_E=1` (internship) and `f_E=2` (entry level)
    returned the same ten cards for "software", and `f_E=1` with no keyword returned a Helper and
    a Senior Executive. `sortBy=DD` changed nothing either. The level has to be in the words.
  - **A bare "intern" finds no tech.** 0 of its first 20 cards: sales, marketing and events.
  - **Each role-plus-level term adds its own postings.** A first page was 7 to 10 of 10 relevant
    by the title-only filter for 12 of the 14 terms (software testing 5, product manager 4), and
    added 5 to 10 cards no earlier term had found. "full stack developer intern" (4) and
    "junior software developer" (3) added least and are left out.
  - **Depth.** "software engineer intern" over the past month: 10 of 10 relevant at start=0 and
    start=50, 9 of 10 at start=100, 5 of 10 at start=250. Over the past week: 9 of 10 at
    start=50, 5 of 10 at start=100. 7 of the week's first 10 cards were not on the month's first
    page. A first sweep uses the month, since nothing is stored yet and a personal computer can
    be off for days; later sweeps, about a day apart, use the week, and a posting seen in its
    first week then stays in the feed for the 21 days the feed keeps a posting it no longer sees.
  - **Cities add little.** Bengaluru's first page added 4 cards the India-wide pages had not.
  - **Yield.** The 19 sampled pages of the chosen shapes held 159 distinct cards, 8.4 per request,
    all located in India, 134 of them kept by `config/filters.json` on the title alone. The other
    16% are never stored, which is why `wanted` exists: without it they would take their share
    of the description cap again on every run. At 60 pages a first sweep expects about 500
    distinct cards, against 130 to 180 before; a daily sweep of 35 about 290, most of them
    already stored.
  - **Guest views** were 31 to 79 KB each, with 1,200 to 7,100 characters of description.
- **Naukri deliberately remains unimplemented.** Its job search API, `naukri.com/jobapi/v3/search`,
  answers a plain request with `{"message":"recaptcha required","statusCode":406}`. Reaching the
  data means defeating a CAPTCHA, which this project will not do, for the same reason it will not
  replay a session cookie. Adzuna, below, is the legitimate route to Indian boards like it: it
  describes itself as searching every major job board in India. Which boards its feed actually
  includes is Adzuna's to say, and no page of Adzuna's we could read names Naukri.

What does work for the rest is a **licensed aggregator**: a company that already pays for the right to index
those boards and resells it through a documented API.

| Aggregator | Cost | India | Notes |
| --- | --- | --- | --- |
| **Adzuna** | free tier | yes | Best fit. Documented, stable, indexes boards with no API of their own. Adapter already written, see below. |
| **Careerjet** | free with an affiliate id | yes | Wide coverage, thinner metadata. |
| **Jooble** | free key on request | yes | Per-country keys. |
| **SerpApi (Google Jobs)** | paid | yes | Reads Google's own index, which already contains Naukri and Foundit listings. Most coverage, real per-call cost. |

`packages/sources/src/boards/adzuna.js` is written and registered, and is deliberately **not** in
`config/companies.json`: the scrape adds it on its own whenever a key exists
(`apps/scraper/src/sources.js`), and leaves it out otherwise rather than log a failed source on
every run. Register a free app at https://developer.adzuna.com, then either paste the app id and
key into Settings (kept in the data folder as `adzuna-key.json`) or set:

```
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...
```

The pair saved in Settings wins over the environment. Both `npm run scrape` and the app's refresh
pick it up. The free key allows 25 requests a minute, 250 a day, 1,000 a week and 2,500 a month
(https://developer.adzuna.com/docs/terms_of_service); a run asks for at most three pages of 50,
newest first and no older than 60 days, so it spends at most four requests counting the runner's
one retry. The limits and the query live in `packages/sources/src/boards/adzuna-url.js`.

The one thing your own login legitimately unlocks is your own data: most sites let you export your
saved jobs and application history. That is useful for tracking what you already applied to, but it
is not a discovery feed, so it does not belong in this pipeline.

## Platforms worth adding next

Ordered roughly easiest to hardest. Endpoints marked **verified** were called successfully while
writing this. The rest are the domain to watch for plus a starting point; confirm the exact URL
with the Network tab method above before you build against it.

### Straightforward, public JSON

- **Rippling** - **verified**: `GET https://api.rippling.com/platform/api/ats/v1/board/{slug}/jobs`
  returns the full board as JSON in one call, with `/jobs/{id}` for a single posting. This is the
  easiest one on the list and it is growing fast among US startups. Do this one first.
- **JazzHR** - boards live on `{slug}.applytojob.com`. Small companies, but a short adapter once
  you find the feed. There is a JSON endpoint under `/apply/`, the exact path has moved over
  time, so read it off the Network tab rather than trusting a path from a blog post.
- **Teamtailor** - boards at `https://{slug}.teamtailor.com/jobs`. The official API needs a
  token, so target the public board feed instead. Popular in the Nordics.
- **Freshteam** - `{slug}.freshteam.com`, with job postings under `/api/`. Some tenants require a
  key and some do not. Worth trying because of its Indian footprint.

### Doable, but real work

- **BambooHR** - `{slug}.bamboohr.com/careers`. Very common among small and mid-size companies.
  The careers page is now an SPA shell, so the listing comes from a separate call, and the body
  needs a second request per job. Two calls per posting is the real cost here.
- **Jobvite** - `https://jobs.jobvite.com/{slug}/search` is HTML. Some tenants have a JSON feed,
  inconsistently. Expect per-tenant special cases.
- **iCIMS** - `https://careers-{slug}.icims.com`. Widely used by large enterprises, including in
  India. Mostly HTML, paginated, and the markup varies by tenant. Doable but tedious.

### Painful, high value

- **Workday** - done, see "Workday boards" under tier 1. About a hundred Indian-hiring
  employers are configured on it.

- **Oracle HCM, SAP SuccessFactors, Eightfold, Avature** - done, see their sections under tier 1.
  Left out: the SuccessFactors Unify sites (Wipro, HCLTech, BT, Standard Chartered), whose job API
  robots.txt disallows; eClerx and Cummins (their careers pages answer 403); Eaton (Eightfold, a 429
  on the first request); IBM (an AWS WAF challenge).
- **Phenom** (ABB, Siemens Healthineers, Quest Global, Zimmer Biomet) - not done. Confirm the JSON
  endpoint with the Network tab method above before building on it.

- **Darwinbox** (`{tenant}.darwinbox.in`) - the dominant ATS among Indian consumer companies.
  The detection sweep found unacademy, clevertap, licious, pharmeasy, tata 1mg, emeritus and
  upgrad all on it. High value for this project specifically. The public board is JS rendered,
  so it is either a hidden JSON endpoint (look first, the SPA has to call something) or a
  headless browser.

### Indian job boards

We already scrape Internshala, Unstop, Instahyre and LinkedIn's guest search. Realistic
assessment of the rest:

- **Wellfound (formerly AngelList Talent)** - stays out. It is startup and remote heavy, which
  would suit this project, but it answered 403 to automated requests when checked on 2026-09-30,
  and its terms are stricter than an ATS board's. A block is a no, so there is nothing to build.
- **Cutshort** - mid-size, Indian, tech focused. JS heavy. Check for an internal API.
- **Instahyre** - done, `packages/sources/src/boards/instahyre.js`. An earlier version of this
  note said it required login; applying does, the listing search does not. `/api/v1/job_search`
  is public JSON. Free text is ignored, so it is filtered by job function id (the taxonomy is at
  `/api/v1/job_function/`), and more than three ids in one request is a 400. The payload has
  no description and no date, and the company sits under `employer.company_name`.
- **Hirect** - chat-first and mobile-first. There is no meaningful public web board to scrape.
  Skip it.
- **Naukri** - by far the largest Indian job board, and deliberately not implemented. Its job
  API answers `{"message":"recaptcha required","statusCode":406}`, and defeating a CAPTCHA is
  out of scope for this project; their terms forbid automated access as well. **Do not scrape
  Naukri.** Adzuna is the legitimate route to Indian boards; see the aggregator section above.

---

## robots.txt, terms of service, and rate limiting

These matter much less for tier 1 and 2 than for tier 3, and it is worth being clear about why.

**Public ATS JSON APIs** (Greenhouse, Lever, Ashby, SmartRecruiters, Workable, Recruitee,
Personio, and the `/wday/cxs/` endpoint every Workday careers site calls for itself) exist so
that job listings get distributed. They are unauthenticated, documented or
semi-documented, and the company publishing them wants the postings seen. Calling them once per
run is what they are for. This is the comfortable case, and it is another reason to prefer tiers
1 and 2.

**Scraping HTML from a job board is different**, and three things apply:

1. **Check `robots.txt`** at `https://site.com/robots.txt` before writing the adapter. If the
   listing path is disallowed, respect it.
2. **Check the terms of service.** Some boards, Naukri being the clearest example, forbid
   automated access outright. "It is technically possible" is not the test.
3. **Rate limit yourself.** The current design already helps: a per-host gate (see below) and
   a 15 second timeout. If you add a paging adapter, keep
   the page count small (`internshala.js` uses `PAGES = 2`) and do not fan out concurrently
   against one host. A scraper that hammers a site gets the IP banned, and then every source on
   that host dies at once.

Also, practically: keep the total source count sane. Every board is a sequential HTTP request in
the run. Eighty boards is a comfortable run. Eight hundred, most of them dead slugs, is a run
that times out and a log nobody reads.

---

## How a run treats hosts, failures and closed postings

**One queue per host.** 55 Greenhouse boards share one API and about a hundred Workday tenants
share a handful of data centres, so the run's http has a gate (`packages/sources/src/host-gate.js`,
paces in `host-rules.js`): platform APIs two requests in flight half a second apart, each Workday
data centre four at a quarter second, LinkedIn one every two seconds, and every other host one
request a second. A host that answers 429 gets nothing more that run. The runner takes sources
round-robin by platform (`apps/scraper/src/interleave.js`) so its 8 workers are not all waiting on
one host, and retries only what a second try could mend (`retry.js`): no answer, a timeout, a 5xx,
never a 4xx or a refusal.

**Unchanged boards cost nothing.** Greenhouse and Ashby answer `If-None-Match` with an empty 304
(checked 2026-09-30: GitLab's 3 MB board came back as 0 bytes), so their adapters send the ETag of
the last full read (`packages/sources/src/conditional.js`), kept in the run's source memo for a
week at most. On a 304 every posting that read listed counts as seen again. Lever sends an ETag
and ignores it, so it is not asked. SmartRecruiters reads a posting's body only for postings the
store has not described and the relevance filter would keep, 40 a board per run at most, where it
used to read all of them (831 on 2026-09-30) on every run.

**Source health.** `apps/scraper/src/source-guard.js` keeps a record per source in
`source-health.json`: three failed runs in a row rest a source for three days, doubling to two
weeks; a 404 or 410 twice rests it two weeks and says to check its name; a 429 rests it a week.
A source that stops listing anything, or whose descriptions go missing, is flagged. Settings'
Postings card lists both, and a resting source shows in the run as skipped.

**Closed postings** leave the store in the same write (`packages/store/src/corpus-closure.js`):

- An adapter that lists everything its board has sets `complete` (Greenhouse, Lever, Ashby,
  Workable, Recruitee, Personio, and SmartRecruiters when it paged to the end). A posting such a
  source did not list on two clean runs in a row is closed.
- A deadline the board publishes closes a posting once it passes: Unstop's registration end and
  Greenhouse's application deadline arrive as `closesAt`.
- For the rest, up to 40 postings a run that no source has shown for three days are checked at
  their own link (`apps/scraper/src/closure-turn.js`, `packages/sources/src/closure/`), one request
  per host every three seconds, only where robots.txt allows. A 404 or 410, a redirect that leaves
  the job's id behind (Greenhouse sends a closed job to `/board?error=true`), or a page that says
  so (Apple's "this role does not exist or is no longer available") closes it; a live page counts
  as a sighting; an error, a timeout or a 429 changes nothing. Workday is checked through its job
  API, which answers 404. Some postings are never checked: LinkedIn and Adzuna (robots.txt
  disallows their links), Instahyre and Remotive (a Cloudflare challenge answers), Ashby and
  Unstop (their pages read the same open or closed).
- A closed posting is deleted unless the person saved, applied to or otherwise used it; those stay
  with `closedAt`, out of the feed, in their own lists with a Closed chip.

**Hacker News "Who is hiring"** (`boards/hn-hiring.js`) reads the monthly thread through HN
Search (hn.algolia.com) and keeps posts in India or remote without a region lock
(`hn-place.js`): a remote post that also names a place outside India ("NYC or Remote") is left
out unless it says worldwide. That kept 28 of the 254 posts in September 2026. A post that links
out links to the company.

---

## Checklist for a new source

- [ ] Confirmed the endpoint returns JSON with no auth, from a clean terminal
- [ ] Adapter is under 100 lines, ESM, no semicolons, no em dashes
- [ ] Every field access is defensive (`?.` and `|| ''`)
- [ ] `description` is plain text, not HTML
- [ ] `level` is set only on an explicit platform internship signal, otherwise omitted
- [ ] `type` is not set at all
- [ ] Paging, if any, is wrapped in try/catch per page
- [ ] Registered in `registry.js`
- [ ] Fixture test added, built from a real captured response
- [ ] `npx vitest run packages/sources` is green
- [ ] Slugs added to `config/companies.json` are verified with a real request
