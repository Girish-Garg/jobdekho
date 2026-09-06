// The base tables, spelled out so a fresh Postgres volume bootstraps from
// `npm run db:migrate` alone. schema.js stays the source of truth for the
// ORM, and drizzle-kit push is what normally turns it into DDL - but push is
// a dev tool that a runtime container does not carry, and it cannot be
// re-run against an existing database (see the header in migrate.js). Every
// statement is IF NOT EXISTS, so a database that already has these tables is
// left alone and the additive statements in migrate.js bring it up to date.
//
// Column order, types and constraint names match what `drizzle-kit generate`
// emits for schema.js, so a later `npm run db:push` finds nothing to change.
// The test in migrate.test.js checks every schema column is named here.
export const CREATE_TABLES = [
  `create table if not exists postings (
     id text primary key,
     source text not null,
     external_id text not null,
     title text not null,
     company text not null,
     location text not null default '',
     url text not null,
     description_snippet text not null default '',
     description_text text,
     tags text[] not null default '{}',
     stipend text,
     duration text,
     experience text,
     posted_at timestamp,
     first_seen_at timestamp not null default now(),
     status text not null default 'new',
     type text,
     level text,
     degree_min text,
     work_mode text,
     stipend_min integer,
     currency text,
     duration_months integer,
     experience_years integer,
     group_key text,
     last_seen_at timestamp,
     degree_required boolean
   )`,
  `create table if not exists runs (
     id text primary key,
     started_at timestamp not null default now(),
     source_results jsonb not null,
     new_count integer not null default 0
   )`,
  `create table if not exists users (
     id text primary key,
     google_id text not null,
     email text not null,
     name text,
     avatar_url text,
     created_at timestamp not null default now(),
     constraint users_google_id_unique unique (google_id)
   )`,
  `create table if not exists user_postings (
     user_id text not null,
     posting_id text not null,
     status text not null,
     updated_at timestamp not null default now(),
     constraint user_postings_user_id_posting_id_pk primary key (user_id, posting_id)
   )`,
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
  `create table if not exists user_filters (
     user_id text primary key,
     include_keywords text[] not null default '{}',
     exclude_keywords text[] not null default '{}',
     locations text[] not null default '{}',
     levels text[] not null default '{}',
     sources text[] not null default '{}',
     excluded_sources text[] not null default '{}',
     work_modes text[] not null default '{}',
     max_degree text,
     min_stipend integer,
     max_duration_months integer,
     max_experience_years integer,
     updated_at timestamp not null default now()
   )`,
  `create table if not exists notification_prefs (
     user_id text primary key,
     channel text not null default 'none',
     telegram_chat_id text,
     enabled boolean not null default true,
     updated_at timestamp not null default now()
   )`,
]
