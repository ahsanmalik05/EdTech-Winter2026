DO $$ BEGIN
  CREATE TYPE "public"."pdf_upload_status" AS ENUM('uploaded', 'failed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "pdf_uploads" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer,
  "content_hash" varchar(64) NOT NULL,
  "original_name" varchar(512),
  "object_key" varchar(1024),
  "file_size_bytes" integer,
  "status" "pdf_upload_status" DEFAULT 'uploaded' NOT NULL,
  "reused_existing" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "source_documents" (
  "id" serial PRIMARY KEY NOT NULL,
  "text_hash" varchar(64) NOT NULL,
  "source_text" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "source_documents_text_hash_unique" UNIQUE("text_hash")
);

ALTER TABLE "translation_log" ADD COLUMN IF NOT EXISTS "source_text_hash" varchar(64);
ALTER TABLE "translation_log" ADD COLUMN IF NOT EXISTS "source_document_id" integer;
ALTER TABLE "translation_log" ADD COLUMN IF NOT EXISTS "grade_level" varchar(100);
ALTER TABLE "translation_log" ADD COLUMN IF NOT EXISTS "cached" boolean DEFAULT false NOT NULL;

DO $$ BEGIN
  ALTER TABLE "pdf_uploads" ADD CONSTRAINT "pdf_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "translation_log" ADD CONSTRAINT "translation_log_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_pdf_uploads_content_hash" ON "pdf_uploads" ("content_hash");
CREATE INDEX IF NOT EXISTS "idx_translation_log_source_text_hash" ON "translation_log" ("source_text_hash");
CREATE INDEX IF NOT EXISTS "idx_translation_log_cache_key" ON "translation_log" ("source_text_hash", "target_language", "model", "grade_level");
CREATE INDEX IF NOT EXISTS "idx_pdf_uploads_created_at_status" ON "pdf_uploads" ("created_at", "status");
