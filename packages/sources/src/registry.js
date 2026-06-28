import { greenhouse } from './providers/greenhouse.js'
import { lever } from './providers/lever.js'
import { ashby } from './providers/ashby.js'
import { amazon } from './companies/amazon.js'
import { microsoft } from './companies/microsoft.js'
import { google } from './companies/google.js'
import { ey } from './companies/ey.js'
import { internshala } from './boards/internshala.js'
import { unstop } from './boards/unstop.js'

const PROVIDERS = { greenhouse, lever, ashby }
const COMPANIES = { amazon, microsoft, google, ey }
const BOARDS = { internshala, unstop }

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
