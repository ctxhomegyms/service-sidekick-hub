-- Create checklist templates table
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create checklist template items table
CREATE TABLE public.checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  item_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for checklist_templates
CREATE POLICY "Admin/dispatcher can manage checklist templates"
ON public.checklist_templates
FOR ALL
USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Authenticated users can view checklist templates"
ON public.checklist_templates
FOR SELECT
USING (true);

-- RLS policies for checklist_template_items
CREATE POLICY "Admin/dispatcher can manage template items"
ON public.checklist_template_items
FOR ALL
USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Authenticated users can view template items"
ON public.checklist_template_items
FOR SELECT
USING (true);

-- Add trigger for updated_at on templates
CREATE TRIGGER update_checklist_templates_updated_at
BEFORE UPDATE ON public.checklist_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();