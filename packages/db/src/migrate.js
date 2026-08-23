import { pathToFileURL } from 'node:url'
import { neon } from '@neondatabase/serverless'

// Additive-only migration for the seniority and degree taxonomy.
//
// drizzle-kit push cannot do this one: its diff tries to recreate the
// user_postings composite primary key and Postgres rejects it with 42P16
// ("column user_id is in a primary key"), aborting the whole run. These
// statements add columns and nothing else, and every one is IF NOT EXISTS,
// so the migration is idempotent and safe to re-run.
export const STATEMENTS = [
  'alter table postings add column if not exists level text',
  'alter table postings add column if not exists degree_min text',
  'alter table postings add column if not exists degree_required boolean',
  'alter table postings add column if not exists work_mode text',
  'alter table postings add column if not exists stipend_min integer',
  'alter table postings add column if not exists duration_months integer',
  'alter table postings add column if not exists experience_years integer',
  'alter table postings add column if not exists group_key text',
  'alter table postings add column if not exists last_seen_at timestamp',
  'alter table postings add column if not exists currency text',
  'create index if not exists postings_group_key_idx on postings (group_key)',
  'create index if not exists postings_last_seen_idx on postings (last_seen_at)',
  // "newest" is the fallback sort whenever no sort is requested or an unknown
  // one is passed (see orderFor in posting-order.js), so most page loads pay
  // this ORDER BY. Built DESC NULLS LAST to match that clause exactly - a
  // plain ascending index stores NULLS LAST but reverses to NULLS FIRST when
  // scanned backward for DESC, so it would not satisfy this ordering as directly.
  // The window functions in listPostingsForUser share this same ordering
  // (postedAt desc, id desc) for their partition, so a scan in this index's
  // order can also feed that computation instead of a separate full sort.
  'create index if not exists postings_posted_at_idx on postings (posted_at desc nulls last)',
  // source is an equality/IN filter on a column with roughly one value per
  // board (~90 and climbing), so it is selective enough to be worth the write
  // cost - unlike level/degree_min/work_mode, which top out at 3-6 values and
  // would prune too little of the table to earn an index scan over a seq scan.
  // listSources() also groups by this column for the per-source counts shown
  // in the UI, which the same index speeds up.
  'create index if not exists postings_source_idx on postings (source)',
  // Rows predating last_seen_at would otherwise read as "no evidence" forever
  // and never age out, even though a scrape has since run without returning
  // them. Seeding from first_seen_at lets the real stale ones expire on time.
  'update postings set last_seen_at = first_seen_at where last_seen_at is null',
  `create table if not exists user_profiles (
     user_id text primary key,
     skills text[] not null default '{}',
     titles text[] not null default '{}',
     locations text[] not null default '{}',
     years integer,
     degree text,
     resume_text text,
     resume_name text,
     updated_at timestamp not null default now()
   )`,
  "alter table user_filters add column if not exists excluded_sources text[] not null default '{}'",
  "alter table user_filters add column if not exists work_modes text[] not null default '{}'",
  "alter table user_filters add column if not exists levels text[] not null default '{}'",
  "alter table user_filters add column if not exists sources text[] not null default '{}'",
  'alter table user_filters add column if not exists max_degree text',
  'alter table user_filters add column if not exists min_stipend integer',
  'alter table user_filters add column if not exists max_duration_months integer',
  'alter table user_filters add column if not exists max_experience_years integer',
]

export async function migrate(sql, statements = STATEMENTS) {
  for (const statement of statements) await sql(statement)
  return statements.length
}

async function main() {
  try { process.loadEnvFile() } catch {}
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
  const count = await migrate(neon(process.env.DATABASE_URL))
  console.log(`Applied ${count} additive statement(s).`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err.message || err); process.exit(1) })
}
