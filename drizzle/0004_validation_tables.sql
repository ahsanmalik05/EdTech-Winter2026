CREATE TABLE "template_validations" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"generation_log_id" integer,
	"is_valid" boolean NOT NULL,
	"issues" jsonb DEFAULT '[]' NOT NULL,
	"model" varchar(255),
	"validated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_validations" (
	"id" serial PRIMARY KEY NOT NULL,
	"translation_log_id" integer NOT NULL,
	"back_translated_text" text,
	"similarity_score" numeric(4, 3),
	"similarity_reasoning" text,
	"section_count_match" boolean,
	"original_section_count" integer,
	"translated_section_count" integer,
	"headers_intact" boolean,
	"overall_confidence" numeric(4, 3),
	"translator_notes" text,
	"issues" jsonb DEFAULT '[]' NOT NULL,
	"validated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "template_validations" ADD CONSTRAINT "template_validations_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_validations" ADD CONSTRAINT "template_validations_generation_log_id_template_generation_log_id_fk" FOREIGN KEY ("generation_log_id") REFERENCES "public"."template_generation_log"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_validations" ADD CONSTRAINT "translation_validations_translation_log_id_translation_log_id_fk" FOREIGN KEY ("translation_log_id") REFERENCES "public"."translation_log"("id") ON DELETE cascade ON UPDATE no action;
