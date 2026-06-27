import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema.js'

export function createDb(url) {
  return drizzle(neon(url), { schema })
}
