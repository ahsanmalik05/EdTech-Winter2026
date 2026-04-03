import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoles = pgEnum("user_role", ["user", "admin"]);
export const scopes = pgEnum("scopes", ["read", "translate", "write"]);
export const pdfUploadStatuses = pgEnum("pdf_upload_status", [
  "uploaded",
  "failed",
  "skipped",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: userRoles("role").notNull().default("user"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerifiedAt: timestamp("email_verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const email_verification_tokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const source_documents = pgTable("source_documents", {
  id: serial("id").primaryKey(),
  textHash: varchar("text_hash", { length: 64 }).notNull().unique(),
  sourceText: text("source_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const translation_log = pgTable("translation_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  sourceText: varchar("source_text").notNull(),
  translatedText: varchar("translated_text"),
  sourceLanguage: varchar("source_language", { length: 16 }),
  targetLanguage: varchar("target_language", { length: 16 }).notNull(),
  model: varchar("model", { length: 255 }).notNull(),
  tokenCount: integer("token_count"),
  inputTokenCount: integer("input_token_count"),
  outputTokenCount: integer("output_token_count"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
  latencyMs: integer("latency_ms").notNull(),
  sourceTextHash: varchar("source_text_hash", { length: 64 }),
  sourceDocumentId: integer("source_document_id").references(
    () => source_documents.id,
  ),
  gradeLevel: varchar("grade_level", { length: 100 }),
  cached: boolean("cached").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pdf_uploads = pgTable("pdf_uploads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  contentHash: varchar("content_hash").notNull(),
  originalName: varchar("original_name"),
  objectKey: varchar("object_key"),
  fileSizeBytes: integer("file_size_bytes"),
  status: pdfUploadStatuses("status").notNull(),
  reusedExisting: boolean("reused_existing").notNull().default(false),
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
  tokenCount: integer("token_count"),
  inputTokenCount: integer("input_token_count"),
  outputTokenCount: integer("output_token_count"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
  latencyMs: integer("latency_ms").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const template_validations = pgTable("template_validations", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
  generationLogId: integer("generation_log_id").references(
    () => template_generation_log.id,
    { onDelete: "set null" },
  ),
  isValid: boolean("is_valid"),
  issues: jsonb("issues").$type<string[]>().default([]).notNull(),
  model: varchar("model", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("completed"),
  validatedAt: timestamp("validated_at").defaultNow().notNull(),
});

export const translation_validations = pgTable("translation_validations", {
  id: serial("id").primaryKey(),
  translationLogId: integer("translation_log_id")
    .notNull()
    .references(() => translation_log.id, { onDelete: "cascade" }),
  backTranslatedText: text("back_translated_text"),
  similarityScore: numeric("similarity_score", { precision: 4, scale: 3 }),
  similarityReasoning: text("similarity_reasoning"),
  sectionCountMatch: boolean("section_count_match"),
  originalSectionCount: integer("original_section_count"),
  translatedSectionCount: integer("translated_section_count"),
  headersIntact: boolean("headers_intact"),
  overallConfidence: numeric("overall_confidence", { precision: 4, scale: 3 }),
  translatorNotes: text("translator_notes"),
  issues: jsonb("issues").$type<string[]>().default([]).notNull(),
  validatedAt: timestamp("validated_at").defaultNow().notNull(),
});

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type ApiKey = InferSelectModel<typeof api_keys>;
export type NewApiKey = InferInsertModel<typeof api_keys>;

export type GlossaryTerm = InferSelectModel<typeof translation_glossary>;
export type NewGlossaryTerm = InferInsertModel<typeof translation_glossary>;

export type Template = InferSelectModel<typeof templates>;
export type NewTemplate = InferInsertModel<typeof templates>;
export type TemplateSection = InferSelectModel<typeof templateSections>;
export type NewTemplateSection = InferInsertModel<typeof templateSections>;
export type TemplateTranslation = InferSelectModel<typeof templateTranslations>;
export type NewTemplateTranslation = InferInsertModel<
  typeof templateTranslations
>;

export type SourceDocument = InferSelectModel<typeof source_documents>;
export type NewSourceDocument = InferInsertModel<typeof source_documents>;

export type TranslationLog = InferSelectModel<typeof translation_log>;
export type NewTranslationLog = InferInsertModel<typeof translation_log>;

export type PdfUpload = InferSelectModel<typeof pdf_uploads>;
export type NewPdfUpload = InferInsertModel<typeof pdf_uploads>;

export type TemplateGenerationLog = InferSelectModel<
  typeof template_generation_log
>;
export type NewTemplateGenerationLog = InferInsertModel<
  typeof template_generation_log
>;

export type TemplateValidation = InferSelectModel<typeof template_validations>;
export type NewTemplateValidation = InferInsertModel<
  typeof template_validations
>;

export type TranslationValidation = InferSelectModel<
  typeof translation_validations
>;
export type NewTranslationValidation = InferInsertModel<
  typeof translation_validations
>;

export type EmailVerificationToken = InferSelectModel<
  typeof email_verification_tokens
>;
export type NewEmailVerificationToken = InferInsertModel<
  typeof email_verification_tokens
>;
