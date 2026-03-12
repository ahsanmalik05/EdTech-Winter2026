import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const scopes = pgEnum("scopes", ["read", "translate", "write"]);
export const classroomRoles = pgEnum("classroom_roles", ["teacher", "student"]);
export const worksheetProgress = pgEnum("worksheet_progress", [
  "not_started",
  "in_progress",
  "completed",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  // this will be hashed
  password: varchar("password", { length: 255 }).notNull(),
  lastWorksheetId: integer("last_worksheet_id"),
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

export const classrooms = pgTable("classrooms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  classCode: varchar("class_code", { length: 24 }).notNull().unique(),
  ownerUserId: integer("owner_user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const worksheets = pgTable("worksheets", {
  id: serial("id").primaryKey(),
  classroomId: integer("classroom_id").references(() => classrooms.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }),
  createdByUserId: integer("created_by_user_id")
    .notNull()
    .references(() => users.id),
  isAssigned: boolean("is_assigned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const classroom_memberships = pgTable("classroom_memberships", {
  id: serial("id").primaryKey(),
  classroomId: integer("classroom_id")
    .notNull()
    .references(() => classrooms.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  role: classroomRoles("role").notNull().default("student"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const user_worksheet_progress = pgTable("user_worksheet_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  worksheetId: integer("worksheet_id")
    .notNull()
    .references(() => worksheets.id),
  status: worksheetProgress("status").notNull().default("not_started"),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export type User = InferSelectModel<typeof users>;
export type ApiKey = InferSelectModel<typeof api_keys>;
export type Classroom = InferSelectModel<typeof classrooms>;
export type Worksheet = InferSelectModel<typeof worksheets>;
export type ClassroomMembership = InferSelectModel<typeof classroom_memberships>;
export type UserWorksheetProgress = InferSelectModel<
  typeof user_worksheet_progress
>;

export type NewUser = InferInsertModel<typeof users>;
export type NewApiKey = InferInsertModel<typeof api_keys>;
export type NewClassroom = InferInsertModel<typeof classrooms>;
export type NewWorksheet = InferInsertModel<typeof worksheets>;
export type NewClassroomMembership = InferInsertModel<
  typeof classroom_memberships
>;
export type NewUserWorksheetProgress = InferInsertModel<
  typeof user_worksheet_progress
>;
