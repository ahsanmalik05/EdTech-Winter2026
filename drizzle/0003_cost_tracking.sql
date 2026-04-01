-- Add enhanced logging columns to translation_log table
ALTER TABLE "translation_log"
  ADD COLUMN IF NOT EXISTS "source_language" varchar(16),
  ADD COLUMN IF NOT EXISTS "input_token_count" integer,
  ADD COLUMN IF NOT EXISTS "output_token_count" integer,
  ADD COLUMN IF NOT EXISTS "cost_usd" numeric(10, 6);

-- Add enhanced logging columns to template_generation_log table
ALTER TABLE "template_generation_log"
  ADD COLUMN IF NOT EXISTS "token_count" integer,
  ADD COLUMN IF NOT EXISTS "input_token_count" integer,
  ADD COLUMN IF NOT EXISTS "output_token_count" integer,
  ADD COLUMN IF NOT EXISTS "cost_usd" numeric(10, 6);
