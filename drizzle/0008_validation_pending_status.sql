-- Add status column to template_validations (pending → completed/failed)
ALTER TABLE template_validations ADD COLUMN status varchar(20) NOT NULL DEFAULT 'completed';

-- Make is_valid nullable so pending rows can omit it
ALTER TABLE template_validations ALTER COLUMN is_valid DROP NOT NULL;
