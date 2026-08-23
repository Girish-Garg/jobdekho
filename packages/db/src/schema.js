import { pgTable, text, timestamp, jsonb, integer, primaryKey, boolean } from 'drizzle-orm/pg-core'

export const postings = pgTable('postings', {
  id: text('id').primaryKey(),
  source: text('source').notNull(),
  externalId: text('external_id').notNull(),
  title: text('title').notNull(),
  company: text('company').notNull(),
  location: text('location').notNull().default(''),
  url: text('url').notNull(),
  descriptionSnippet: text('description_snippet').notNull().default(''),
  // What the ranking matches skills against - requirements sit well past the
  // 280-character display snippet. NULL until a re-scrape on rows predating it.
  descriptionText: text('description_text'),
  tags: text('tags').array().notNull().default([]),
  stipend: text('stipend'),
  duration: text('duration'),
  experience: text('experience'),
  postedAt: timestamp('posted_at'),
  firstSeenAt: timestamp('first_seen_at').notNull().defaultNow(),
  status: text('status').notNull().default('new'),
  type: text('type'),
  level: text('level'),
  degreeMin: text('degree_min'),
  workMode: text('work_mode'),
  stipendMin: integer('stipend_min'),
  // The unit stipendMin was converted FROM. stipendMin itself is always
  // normalized to INR/month for comparison, so this is display-only context
  // ("$60k - $80k" should still say USD even though it sorts as rupees).
  currency: text('currency'),
  durationMonths: integer('duration_months'),
  experienceYears: integer('experience_years'),
  groupKey: text('group_key'),
  // Refreshed on every upsert. A posting the adapters stop returning is almost
  // certainly closed, and this is the only way to notice.
  lastSeenAt: timestamp('last_seen_at'),
  degreeRequired: boolean('degree_required'),
})

export const runs = pgTable('runs', {
  id: text('id').primaryKey(),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  sourceResults: jsonb('source_results').notNull(),
  newCount: integer('new_count').notNull().default(0),
})

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  googleId: text('google_id').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const userPostings = pgTable('user_postings', {
  userId: text('user_id').notNull(),
  postingId: text('posting_id').notNull(),
  status: text('status').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.userId, t.postingId] }) }))

// One resume per user, reduced to the fields the ranking reads. resumeText is
// kept so the extraction can be re-run after tuning it, without asking for the
// file again. It is the one place a resume's raw content lives.
export const userProfiles = pgTable('user_profiles', {
  userId: text('user_id').primaryKey(),
  skills: text('skills').array().notNull().default([]),
  titles: text('titles').array().notNull().default([]),
  locations: text('locations').array().notNull().default([]),
  years: integer('years'),
  degree: text('degree'),
  resumeText: text('resume_text'),
  resumeName: text('resume_name'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const userFilters = pgTable('user_filters', {
  userId: text('user_id').primaryKey(),
  includeKeywords: text('include_keywords').array().notNull().default([]),
  excludeKeywords: text('exclude_keywords').array().notNull().default([]),
  locations: text('locations').array().notNull().default([]),
  levels: text('levels').array().notNull().default([]),
  sources: text('sources').array().notNull().default([]),
  excludedSources: text('excluded_sources').array().notNull().default([]),
  workModes: text('work_modes').array().notNull().default([]),
  maxDegree: text('max_degree'),
  minStipend: integer('min_stipend'),
  maxDurationMonths: integer('max_duration_months'),
  maxExperienceYears: integer('max_experience_years'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const notificationPrefs = pgTable('notification_prefs', {
  userId: text('user_id').primaryKey(),
  channel: text('channel').notNull().default('none'),
  telegramChatId: text('telegram_chat_id'),
  enabled: boolean('enabled').notNull().default(true),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
