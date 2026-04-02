CREATE TABLE "pdf_uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"flow" varchar(64) NOT NULL,
	"field_name" varchar(64) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"size_bytes" integer NOT NULL,
	"bucket_name" varchar(255),
	"object_key" text,
	"status" varchar(32) NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pdf_uploads" ADD CONSTRAINT "pdf_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
