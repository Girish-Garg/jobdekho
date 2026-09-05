import { greenhouse } from './providers/greenhouse.js'
import { lever } from './providers/lever.js'
import { ashby } from './providers/ashby.js'
import { smartrecruiters } from './providers/smartrecruiters.js'
import { workable } from './providers/workable.js'
import { recruitee } from './providers/recruitee.js'
import { personio } from './providers/personio.js'
import { amazon } from './companies/amazon.js'
import { microsoft } from './companies/microsoft.js'
import { google } from './companies/google.js'
import { ey } from './companies/ey.js'
import { internshala } from './boards/internshala.js'
import { unstop } from './boards/unstop.js'
import { adzuna } from './boards/adzuna.js'
import { remotive } from './boards/remotive.js'
import { remoteok } from './boards/remoteok.js'
import { arbeitnow } from './boards/arbeitnow.js'
import { linkedin } from './boards/linkedin.js'
import { instahyre } from './boards/instahyre.js'

const PROVIDERS = { greenhouse, lever, ashby, smartrecruiters, workable, recruitee, personio }
const COMPANIES = { amazon, microsoft, google, ey }
// adzuna is registered but intentionally not in config/companies.json: it needs
// API credentials, and listing it before those exist would log a failed source
// on every run.
const BOARDS = { internshala, unstop, adzuna, remotive, remoteok, arbeitnow, linkedin, instahyre }

export function buildAdapters(config) {
  const adapters = []
  for (const p of config.providers || []) {
    if (PROVIDERS[p.provider]) adapters.push(PROVIDERS[p.provider]({ slug: p.slug }))
  }
  for (const name of config.companies || []) {
    if (COMPANIES[name]) adapters.push(COMPANIES[name]())
  }
  for (const name of config.boards || []) {
    if (BOARDS[name]) adapters.push(BOARDS[name]())
  }
  return adapters
}
