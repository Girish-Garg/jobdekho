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
  tags: text('tags').array().notNull().default([]),
  stipend: text('stipend'),
  duration: text('duration'),
  experience: text('experience'),
  postedAt: timestamp('posted_at'),
  firstSeenAt: timestamp('first_seen_at').notNull().defaultNow(),
  status: text('status').notNull().default('new'),
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

export const userFilters = pgTable('user_filters', {
  userId: text('user_id').primaryKey(),
  includeKeywords: text('include_keywords').array().notNull().default([]),
  excludeKeywords: text('exclude_keywords').array().notNull().default([]),
  locations: text('locations').array().notNull().default([]),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const notificationPrefs = pgTable('notification_prefs', {
  userId: text('user_id').primaryKey(),
  channel: text('channel').notNull().default('none'),
  telegramChatId: text('telegram_chat_id'),
  enabled: boolean('enabled').notNull().default(true),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
