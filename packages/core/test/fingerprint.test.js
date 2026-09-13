import { describe, it, expect } from 'vitest'
import {
  fingerprint, similarity, isCrossListing, normalizeJdText, MIN_TEXT, CROSSLIST_THRESHOLD,
} from '@jobdekho/core/fingerprint.js'
import { boilerplateIndex } from '@jobdekho/core/boilerplate.js'

// Modelled on Canonical's Greenhouse ads, the pair that scored 0.953 on the
// raw body: every ad opens with the same company story and closes with the
// same culture, benefits and mission blocks, and the role itself is a couple
// of sentences in the middle. The real 4000-character bodies were about
// eight parts template to one part role (26 of 31 sentences shared); here
// the template is about twelve to one, because SimHash over a remainder this
// short is noisy and this is the ratio at which the fixture lands on the
// same 0.953 the corpus produced.
const ABOUT = 'Canonical is a pioneering tech firm at the forefront of the global move to open source. '
  + 'As the company that publishes Ubuntu, one of the most important open source projects and the platform for AI, IoT and the cloud, we are changing the world of software. '
  + 'We recruit on a global basis and set a very high standard for people joining the company. '
  + 'We expect excellence, and we work with a very diverse team across more than seventy countries. '
  + 'Most colleagues work from home and meet in person at sprints held twice a year in a new city each time. '
  + 'We are just over one thousand colleagues in seventy countries and over two hundred and fifty million in revenue, profitable on a steady but relentless growth trajectory. '
const CULTURE = 'A fascination with the state of the art from brilliant people solving hard problems and fierce competition for large prizes is what drives us. '
  + 'We believe that the best people want to work on the hardest problems and we hire for the long term, which means we look for depth of thought as well as breadth of interest. '
  + 'Our hiring process is thorough and starts with a written interview, followed by a standardised aptitude test, a technical interview and a final round with senior leadership. '
  + 'We are a remote first company and have been since our founding in 2004, long before it was fashionable, so the whole company knows how to work well asynchronously. '
  + 'Expect to travel two to four times a year to team sprints and to industry events in Europe, the Americas and Asia. '
const BENEFITS = 'We consider geographical location, experience, and performance in shaping compensation worldwide. '
  + 'We revisit compensation annually and more often for folks that outperform, and in addition to base pay we offer a performance driven annual bonus. '
  + 'Distributed work environment with twice yearly team sprints in person. '
  + 'Personal learning and development budget of two thousand USD per year. '
  + 'Annual compensation review, recognition rewards, annual holiday leave, maternity and paternity leave. '
  + 'Employee assistance programme, opportunity to travel to new locations to meet colleagues, priority pass and travel upgrades for long haul company events. '
const MISSION = 'Ubuntu is used by millions of developers, by most of the public cloud, and by the large majority of container and Kubernetes deployments in production today. '
  + 'Our mission is to make open source the default choice for every enterprise workload by delivering it with the security, support and long term maintenance those workloads require. '
  + 'We work with the leading silicon vendors, cloud providers and hardware manufacturers to certify Ubuntu on their platforms before they ship. '
  + 'We also publish and maintain the leading tools for building, deploying and operating Kubernetes, OpenStack and machine learning infrastructure on private and public clouds. '
  + 'The company is founder led, privately held and has never taken outside investment, which lets us plan in decades rather than quarters. '

const SALES_MANAGER = 'We are hiring regional sales team managers in Europe, the Middle East, India and the Americas, each of whom leads a team of enterprise reps. '
  + 'You have run a quota carrying software sales team and have sold open source infrastructure before. '
const TELECOM_AE = 'We are looking for telecom account executives with a focus on the Middle East, the DACH region, the Nordics, Eastern Europe and the USA. '
  + 'You will own named carrier accounts and close multi year deals for OpenStack and Ubuntu Pro. '
const KERNEL = 'This is an opportunity for a Linux kernel engineer to join the team that maintains the Ubuntu kernel across every supported architecture. '
  + 'You will triage upstream regressions, backport fixes to stable series, review patches from silicon partners and keep the hardware enablement kernels moving with each release. '
  + 'The team owns the generic kernel, the low latency and real time variants, and the cloud kernels tuned for AWS, Azure, GCP and Oracle. '
  + 'Day to day you will bisect regressions reported by users and partners, land fixes in the right series, and write the test cases that stop them coming back. '
  + 'You will also represent Ubuntu at upstream kernel events and in the conversations with silicon vendors about enabling their next generation parts. '
  + 'You have contributed patches upstream and can read a stack trace without a debugger. '
  + 'You are comfortable in C, in git across many branches at once, and in the kernel configuration system. '
  + 'Experience with one of the arm64, ppc64el, s390x or riscv architectures is a plus, as is prior work on a distribution kernel team. '

const employerAd = (role) => ABOUT + role + CULTURE + BENEFITS + MISSION
// An aggregator copies the body whole and appends its own chrome.
const aggregatorCopy = (role) => `${employerAd(role)} Apply now on Instahyre. Posted 3 days ago.`

const CORPUS = [
  { company: 'Canonical', descriptionText: employerAd(SALES_MANAGER) },
  { company: 'Canonical', descriptionText: employerAd(TELECOM_AE) },
  { company: 'Canonical', descriptionText: employerAd(KERNEL) },
  { company: 'Canonical Ltd', descriptionText: aggregatorCopy(KERNEL) },
]

describe('fingerprint', () => {
  it('is a 16 hex digit string, deterministic, and empty under MIN_TEXT', () => {
    const fp = fingerprint(employerAd(KERNEL))
    expect(fp).toMatch(/^[0-9a-f]{16}$/)
    expect(fingerprint(employerAd(KERNEL))).toBe(fp)
    expect(fingerprint('Great react opportunity, apply fast.')).toBe('')
    expect(fingerprint(null)).toBe('')
    expect(normalizeJdText('x'.repeat(MIN_TEXT - 1)).length).toBeLessThan(MIN_TEXT)
  })

  it('strips markup, entities and links before hashing', () => {
    const plain = employerAd(KERNEL)
    const marked = `<p>${plain.replace(/\. /g, '.</p><p>')}</p> &nbsp; https://canonical.com/careers`
    expect(fingerprint(marked)).toBe(fingerprint(plain))
  })

  it('survives a one line edit but not a different body', () => {
    const edited = employerAd(KERNEL).replace('at least five years', 'at least six years')
    expect(similarity(fingerprint(employerAd(KERNEL)), fingerprint(edited))).toBeGreaterThanOrEqual(CROSSLIST_THRESHOLD)
    const other = 'We are a Pune agency looking for a Shopify developer to build storefronts for retail clients. You will write Liquid templates, integrate payment gateways and ship a new store every fortnight. Two years of ecommerce work required. '.repeat(3)
    expect(similarity(fingerprint(employerAd(KERNEL)), fingerprint(other))).toBeLessThan(0.8)
  })
})

describe('similarity', () => {
  it('is 1 for equal fingerprints and 0 for anything malformed', () => {
    expect(similarity('0123456789abcdef', '0123456789abcdef')).toBe(1)
    expect(similarity('', '')).toBe(0)
    expect(similarity(undefined, '0123456789abcdef')).toBe(0)
    expect(similarity('0123456789abcde', '0123456789abcdef')).toBe(0)
  })

  it('counts differing bits across both 32 bit halves, sign bit included', () => {
    expect(similarity('0000000000000000', '8000000000000001')).toBe(1 - 2 / 64)
    expect(similarity('0000000000000000', 'ffffffffffffffff')).toBe(0)
    expect(isCrossListing('0000000000000000', '0000000000000001')).toBe(true)
    expect(isCrossListing('0000000000000000', '000000000000003f')).toBe(false)
  })
})

describe('with the boilerplate stripped', () => {
  const index = boilerplateIndex(CORPUS)
  const stripped = (text) => fingerprint(index.strip(text))

  // The bug that kept this module out of the tree, reproduced: on the raw
  // body two different roles clear the threshold on the shared block alone.
  it('separates two different roles that share the company template', () => {
    const raw = similarity(fingerprint(employerAd(SALES_MANAGER)), fingerprint(employerAd(TELECOM_AE)))
    expect(raw).toBeGreaterThanOrEqual(CROSSLIST_THRESHOLD)
    expect(index.strip(employerAd(SALES_MANAGER)).length).toBeGreaterThanOrEqual(MIN_TEXT)
    expect(index.strip(employerAd(TELECOM_AE)).length).toBeGreaterThanOrEqual(MIN_TEXT)
    expect(similarity(stripped(employerAd(SALES_MANAGER)), stripped(employerAd(TELECOM_AE)))).toBeLessThan(CROSSLIST_THRESHOLD)
  })

  it('still matches the same job on the employer board and on an aggregator', () => {
    const a = stripped(employerAd(KERNEL))
    const b = stripped(aggregatorCopy(KERNEL))
    expect(a).not.toBe('')
    expect(isCrossListing(a, b)).toBe(true)
    expect(isCrossListing(a, stripped(employerAd(SALES_MANAGER)))).toBe(false)
  })
})
