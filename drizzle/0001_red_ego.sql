CREATE TYPE "public"."scopes" AS ENUM('read', 'translate', 'write');--> statement-breakpoint
CREATE TABLE "translation_glossary" (
	"id" serial PRIMARY KEY NOT NULL,
	"term" varchar(255) NOT NULL,
	"meaning" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"usage_context" text NOT NULL,
	"do_not_translate" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "translation_glossary_term_unique" UNIQUE("term")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "scopes" SET DATA TYPE "public"."scopes"[] USING "scopes"::"public"."scopes"[];--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "scopes" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "public_key" varchar(16) NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_public_key_unique" UNIQUE("public_key");