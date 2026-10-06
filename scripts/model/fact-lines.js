import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

// Which lines the facts model is labelled on, and how a label finds its
// line: shared by the training (fact-data.js) and the archive that keeps
// the lines (fact-archive.js).

// A line any of the facts could be stated with, read by hand before it is
// trained on: a word a PPO, an address, the openings, a bond, an early
// start or the shifts are stated with. Broad on purpose, so the hand
// reading sees the wordings no rule lists.
export const CANDIDATE = [
  /\b(?:ppo|pre[- ]?placement|full[- ]?time\b.*\b(?:intern|internship|trainee|after|based on|performance|completion|opportunit|potential|chance|offer|convert|transition|absorb|considered|extend)|(?:intern|internship|trainee|after|based on|performance|completion|opportunit|potential|chance|offer|convert|transition|absorb|considered|extend)\b.*\bfull[- ]?time|permanent (?:role|position|employment|job|opportunit)|convert(?:ed|ion)?|absorb(?:ed|tion)?\b.*\b(?:role|employee|team|company)|job offer|offer letter|returning offer|return offer|\bfte\b)/i,
  /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/i,
  /\b(?:openings?|vacanc(?:y|ies)|positions?|seats|hiring for|headcount)\b.*\b\d{1,3}\b|\b\d{1,3}\b.*\b(?:openings?|vacanc(?:y|ies)|positions?|seats)\b|^number of openings/i,
  /\b(?:bond|service agreement|lock[- ]?in|commit(?:ment)? (?:to|of|for) (?:a )?(?:minimum|\d)|minimum (?:tenure|service|commitment|period)|serve (?:the company|a minimum|for)|training cost|liquidated damages|surety)\b/i,
  /\b(?:immediate(?:ly)?|joiners?|joining|start date|starting date|notice period|asap|available to (?:start|join)|join (?:us )?(?:within|by|in|from)|start (?:within|by|from|on|in))\b/i,
  /\b(?:shifts?|night|nights|rotational|rotating|graveyard|24x7|24\/7|time ?zones?|overlap|(?:US|UK|EU|European|American) (?:hours|time|business hours)|\d{1,2}(?::\d{2})?\s*(?:am|pm)\b.{0,15}\b\d{1,2}(?::\d{2})?\s*(?:am|pm))\b|\b(?:EST|PST|CST|GMT|BST|CET|IST)\b/i,
]
export const isCandidate = (line) => CANDIDATE.some((pattern) => pattern.test(line))

// A label is kept under its line's fingerprint, never the line, so no
// posting text or recruiter's address goes into the repo; the text is
// kept apart, on the maintainer's computer (fact-archive.js).
export const fingerprint = (line) => createHash('sha256').update(line.toLowerCase().replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 16)

const readJson = (name) => JSON.parse(readFileSync(new URL(`./labels/${name}`, import.meta.url), 'utf8'))
export const readLabels = () => readJson('facts.json')
export const readWritten = () => readJson('facts-written.json').examples
