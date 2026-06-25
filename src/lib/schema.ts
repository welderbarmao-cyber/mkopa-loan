import { pgTable, serial, text, timestamp, integer, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('customer'),
  phone: varchar('phone', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const loans = pgTable('loans', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  amount: integer('amount').notNull(),
  termMonths: integer('term_months').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  productType: varchar('product_type', { length: 50 }).notNull(),
  purpose: text('purpose'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const kycUploads = pgTable('kyc_uploads', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  documentType: varchar('document_type', { length: 30 }).notNull(),
  r2Key: text('r2_key').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
});
