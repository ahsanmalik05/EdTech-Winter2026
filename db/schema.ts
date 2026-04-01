import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
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

export const languages = pgTable("languages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  code: varchar("code", { length: 16 }).notNull().unique(),
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


export const translation_glossary = pgTable("translation_glossary", {
  id: serial("id").primaryKey(),
  term: varchar("term", { length: 255 }).notNull().unique(),
  meaning: text("meaning").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  usageContext: text("usage_context").notNull(),
  doNotTranslate: boolean("do_not_translate").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type GlossaryTerm = InferSelectModel<typeof translation_glossary>;
export type NewGlossaryTerm = InferInsertModel<typeof translation_glossary>;


export const sectionTypes = pgEnum("section_type", [
  "introduction",
  "model_assessment",
  "self_review",
]);

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  subject: varchar("subject", { length: 255 }).notNull(),
  topic: varchar("topic", { length: 255 }).notNull(),
  gradeLevel: varchar("grade_level", { length: 100 }).notNull(),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const templateSections = pgTable("template_sections", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
  sectionType: sectionTypes("section_type").notNull(),
  content: text("content").notNull(),
  orderIndex: integer("order_index").notNull(),
});

export const templateTranslations = pgTable("template_translations", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
  languageCode: varchar("language_code", { length: 16 }).notNull(),
  translatedContent: jsonb("translated_content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Template = InferSelectModel<typeof templates>;
export type NewTemplate = InferInsertModel<typeof templates>;
export type TemplateSection = InferSelectModel<typeof templateSections>;
export type NewTemplateSection = InferInsertModel<typeof templateSections>;
export type TemplateTranslation = InferSelectModel<typeof templateTranslations>;
export type NewTemplateTranslation = InferInsertModel<typeof templateTranslations>;

export const translation_log = pgTable("translation_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  sourceText: varchar("source_text").notNull(),
  translatedText: varchar("translated_text"),
  targetLanguage: varchar("target_language", { length: 16 }).notNull(),
  model: varchar("model", { length: 255 }).notNull(),
  tokenCount: integer("token_count"),
  latencyMs: integer("latency_ms").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const template_generation_log = pgTable("template_generation_log", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => templates.id, {
    onDelete: "set null",
  }),
  userId: integer("user_id").references(() => users.id),
  subject: varchar("subject", { length: 255 }).notNull(),
  topic: varchar("topic", { length: 255 }).notNull(),
  gradeLevel: varchar("grade_level", { length: 100 }).notNull(),
  model: varchar("model", { length: 255 }).notNull(),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  latencyMs: integer("latency_ms").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = InferSelectModel<typeof users>;
export type ApiKey = InferSelectModel<typeof api_keys>;
export type TranslationLog = InferSelectModel<typeof translation_log>;
export type NewTranslationLog = InferInsertModel<typeof translation_log>;
export type TemplateGenerationLog = InferSelectModel<typeof template_generation_log>;
export type NewTemplateGenerationLog = InferInsertModel<typeof template_generation_log>;
export type NewUser = InferInsertModel<typeof users>;
export type NewApiKey = InferInsertModel<typeof api_keys>;
