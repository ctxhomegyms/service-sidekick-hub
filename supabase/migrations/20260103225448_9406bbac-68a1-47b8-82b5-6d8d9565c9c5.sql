-- Add item_type and options to checklist_template_items
ALTER TABLE public.checklist_template_items
ADD COLUMN item_type text NOT NULL DEFAULT 'checkbox',
ADD COLUMN options jsonb DEFAULT NULL,
ADD COLUMN is_required boolean NOT NULL DEFAULT false;

-- Add response fields to job_checklist_items
ALTER TABLE public.job_checklist_items
ADD COLUMN item_type text NOT NULL DEFAULT 'checkbox',
ADD COLUMN options jsonb DEFAULT NULL,
ADD COLUMN is_required boolean NOT NULL DEFAULT false,
ADD COLUMN response_text text DEFAULT NULL,
ADD COLUMN response_value jsonb DEFAULT NULL,
ADD COLUMN signature_url text DEFAULT NULL,
ADD COLUMN image_url text DEFAULT NULL;

-- Add comment explaining valid item_type values
COMMENT ON COLUMN public.checklist_template_items.item_type IS 'Valid values: checkbox, single_line, multi_line, dropdown, signature, image';
COMMENT ON COLUMN public.job_checklist_items.item_type IS 'Valid values: checkbox, single_line, multi_line, dropdown, signature, image';