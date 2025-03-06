import type { InferSelectModel } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  foreignKey,
  unique,
} from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

export const user = sqliteTable('User', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  email: text('email').notNull(),
  password: text('password'),
});

export type User = InferSelectModel<typeof user>;

export const chat = sqliteTable('Chat', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  title: text('title').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id),
  visibility: text('visibility', { enum: ['private', 'public'] }).notNull().default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = sqliteTable('Message', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  chatId: text('chatId')
    .notNull()
    .references(() => chat.id),
  role: text('role').notNull(),
  content: text('content', { mode: 'json' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
});

export type Message = InferSelectModel<typeof message>;

export const vote = sqliteTable(
  'Vote',
  {
    chatId: text('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: text('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: integer('isUpvoted', { mode: 'boolean' }).notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = sqliteTable(
  'Document',
  {
    id: text('id').notNull().$defaultFn(() => createId()),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: text('kind', { enum: ['text', 'code', 'image', 'sheet', 'projects'] }).notNull().default('text'),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = sqliteTable(
  'Suggestion',
  {
    id: text('id').notNull().$defaultFn(() => createId()),
    documentId: text('documentId').notNull(),
    documentCreatedAt: integer('documentCreatedAt', { mode: 'timestamp' }).notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: integer('isResolved', { mode: 'boolean' }).notNull().default(false),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const project = sqliteTable('Project', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  name: text('name').notNull(),
  description: text('description'),
  userId: text('userId')
    .notNull()
    .references(() => user.id),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
});

export type Project = InferSelectModel<typeof project> & {
  userEmail?: string;
};

export const page = sqliteTable('Page', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  path: text('path').notNull(),
  htmlContent: text('htmlContent').notNull(),
  projectId: text('projectId')
    .notNull()
    .references(() => project.id),
  userId: text('userId')
    .notNull()
    .references(() => user.id),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  pathUnique: unique().on(table.path)
}));

export type Page = InferSelectModel<typeof page> & {
  projectName?: string;
  userEmail?: string;
};

export const endpoint = sqliteTable('Endpoint', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  path: text('path').notNull(),
  parameters: text('parameters'), // Stored as comma-separated string
  code: text('code').notNull(), // Code to be executed
  language: text('language', { enum: ['javascript', 'python'] }).notNull().default('javascript'),
  httpMethod: text('httpMethod').notNull().default('GET'),
  projectId: text('projectId')
    .notNull()
    .references(() => project.id),
  userId: text('userId')
    .notNull()
    .references(() => user.id),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  pathUnique: unique().on(table.path)
}));

export type Endpoint = InferSelectModel<typeof endpoint> & {
  projectName?: string;
  userEmail?: string;
};
