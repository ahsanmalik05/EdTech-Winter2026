import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  boolean,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const scopes = pgEnum("scopes", ["read", "translate", "write"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  // this will be hashed
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const api_keys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  users_id: serial("users_id")
    .notNull()
    .references(() => users.id),
  // this will also be hashed
  key: varchar("key", { length: 255 }).notNull().unique(),
  publicKey: varchar("public_key", { length: 16 }).notNull().unique(),
  label: varchar("label", { length: 255 }).notNull(),
  scopes: scopes("scopes").notNull().array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = InferSelectModel<typeof users>;
export type ApiKey = InferSelectModel<typeof api_keys>;

export type NewUser = InferInsertModel<typeof users>;
export type NewApiKey = InferInsertModel<typeof api_keys>;
