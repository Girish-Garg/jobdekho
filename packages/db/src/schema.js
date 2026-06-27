import { pgTable, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core'

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
