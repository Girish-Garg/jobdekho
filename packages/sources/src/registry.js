import { greenhouse } from './providers/greenhouse.js'
import { lever } from './providers/lever.js'
import { ashby } from './providers/ashby.js'
import { smartrecruiters } from './providers/smartrecruiters.js'
import { workable } from './providers/workable.js'
import { recruitee } from './providers/recruitee.js'
import { personio } from './providers/personio.js'
import { workday } from './providers/workday.js'
import { successfactors } from './providers/successfactors.js'
import { oracle } from './providers/oracle.js'
import { eightfold } from './providers/eightfold.js'
import { avature } from './providers/avature.js'
import { amazon } from './companies/amazon.js'
import { google } from './companies/google.js'
import { infosys } from './companies/infosys.js'
import { apple } from './companies/apple.js'
import { swiggy } from './companies/swiggy.js'
import { ltimindtree } from './companies/ltimindtree.js'
import { mphasis } from './companies/mphasis.js'
import { hdfcbank } from './companies/hdfcbank.js'
import { coforge } from './companies/coforge.js'
import { cyient } from './companies/cyient.js'
import { internshala } from './boards/internshala.js'
import { unstop } from './boards/unstop.js'
import { adzuna } from './boards/adzuna.js'
import { remotive } from './boards/remotive.js'
import { remoteok } from './boards/remoteok.js'
import { arbeitnow } from './boards/arbeitnow.js'
import { linkedin } from './boards/linkedin.js'
import { instahyre } from './boards/instahyre.js'

const PROVIDERS = {
  greenhouse, lever, ashby, smartrecruiters, workable, recruitee, personio, workday,
  successfactors, oracle, eightfold, avature,
}
// A company's own careers site, where it runs one no platform above covers.
const COMPANIES = {
  amazon, google, infosys, apple, swiggy, ltimindtree, mphasis, hdfcbank, coforge, cyient,
}
// adzuna is registered but intentionally not in config/companies.json: it needs
// API credentials, and listing it before those exist would log a failed source
// on every run.
const BOARDS = { internshala, unstop, adzuna, remotive, remoteok, arbeitnow, linkedin, instahyre }

export function buildAdapters(config) {
  const adapters = []
  for (const p of config.providers || []) {
    // The whole entry, not just the slug: a Workday board is addressed by its
    // careers site URL and named by its company, which one slug cannot carry.
    if (PROVIDERS[p.provider]) adapters.push(PROVIDERS[p.provider](p))
  }
  for (const name of config.companies || []) {
    if (COMPANIES[name]) adapters.push(COMPANIES[name]())
  }
  for (const name of config.boards || []) {
    if (BOARDS[name]) adapters.push(BOARDS[name]())
  }
  return adapters
}
