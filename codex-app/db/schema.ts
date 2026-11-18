import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';

export const records = sqliteTable('records', {
  collection: text('collection').notNull(),
  id: text('id').notNull(),
  value: text('value').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
}, t => [primaryKey({ columns: [t.collection, t.id] })]);

export const history = sqliteTable('history', {
  sequence: integer('sequence').primaryKey({ autoIncrement: true }),
  collection: text('collection').notNull(),
  id: text('id').notNull(),
  value: text('value'),
  revision: integer('revision').notNull(),
  at: text('at').notNull(),
  operation: text('operation').notNull(),
});
