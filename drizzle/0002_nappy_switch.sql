CREATE TABLE "template_generation_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer,
	"user_id" integer,
	"subject" varchar(255) NOT NULL,
	"topic" varchar(255) NOT NULL,
	"grade_level" varchar(100) NOT NULL,
	"model" varchar(255) NOT NULL,
	"success" boolean NOT NULL,
	"error_message" text,
	"latency_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "template_generation_log" ADD CONSTRAINT "template_generation_log_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_generation_log" ADD CONSTRAINT "template_generation_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;