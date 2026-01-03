import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Edit2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface TemplateItem {
  id: string;
  item_text: string;
  sort_order: number;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  items: TemplateItem[];
}

export default function ChecklistTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    items: [''] as string[],
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data: templatesData, error: templatesError } = await supabase
        .from('checklist_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;

      // Fetch items for each template
      const templatesWithItems = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { data: itemsData } = await supabase
            .from('checklist_template_items')
            .select('*')
            .eq('template_id', template.id)
            .order('sort_order');

          return {
            ...template,
            items: itemsData || [],
          };
        })
      );

      setTemplates(templatesWithItems);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        items: template.items.length > 0 
          ? template.items.map(i => i.item_text)
          : [''],
      });
    } else {
      setEditingTemplate(null);
      setFormData({ name: '', description: '', items: [''] });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
    setFormData({ name: '', description: '', items: [''] });
  };

  const handleAddItem = () => {
    setFormData(f => ({ ...f, items: [...f.items, ''] }));
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length === 1) return;
    setFormData(f => ({
      ...f,
      items: f.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index: number, value: string) => {
    setFormData(f => ({
      ...f,
      items: f.items.map((item, i) => (i === index ? value : item)),
    }));
  };

  const handleSaveTemplate = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    const validItems = formData.items.filter(item => item.trim());
    if (validItems.length === 0) {
      toast.error('Please add at least one checklist item');
      return;
    }

    try {
      if (editingTemplate) {
        // Update existing template
        const { error: updateError } = await supabase
          .from('checklist_templates')
          .update({
            name: formData.name,
            description: formData.description || null,
          })
          .eq('id', editingTemplate.id);

        if (updateError) throw updateError;

        // Delete old items and insert new ones
        await supabase
          .from('checklist_template_items')
          .delete()
          .eq('template_id', editingTemplate.id);

        const itemsToInsert = validItems.map((item, index) => ({
          template_id: editingTemplate.id,
          item_text: item,
          sort_order: index,
        }));

        const { error: itemsError } = await supabase
          .from('checklist_template_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        toast.success('Template updated successfully');
      } else {
        // Create new template
        const { data: templateData, error: templateError } = await supabase
          .from('checklist_templates')
          .insert({
            name: formData.name,
            description: formData.description || null,
            created_by: user?.id,
          })
          .select('id')
          .single();

        if (templateError) throw templateError;

        const itemsToInsert = validItems.map((item, index) => ({
          template_id: templateData.id,
          item_text: item,
          sort_order: index,
        }));

        const { error: itemsError } = await supabase
          .from('checklist_template_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        toast.success('Template created successfully');
      }

      handleCloseDialog();
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateId) return;

    try {
      const { error } = await supabase
        .from('checklist_templates')
        .delete()
        .eq('id', deleteTemplateId);

      if (error) throw error;

      toast.success('Template deleted');
      setDeleteTemplateId(null);
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete template');
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Checklist Templates</h1>
            <p className="text-muted-foreground">
              Create reusable checklists for job completion
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        </div>

        {/* Templates Grid */}
        {templates.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="mt-1">
                          {template.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(template)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteTemplateId(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-2">
                    {template.items.length} item{template.items.length !== 1 ? 's' : ''}
                  </div>
                  <ul className="space-y-1">
                    {template.items.slice(0, 4).map((item, idx) => (
                      <li key={item.id} className="flex items-center gap-2 text-sm">
                        <div className="w-4 h-4 rounded border border-muted-foreground/30 flex-shrink-0" />
                        <span className="truncate">{item.item_text}</span>
                      </li>
                    ))}
                    {template.items.length > 4 && (
                      <li className="text-sm text-muted-foreground">
                        +{template.items.length - 4} more items
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                No checklist templates yet. Create your first template!
              </p>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Checklist Template'}
            </DialogTitle>
            <DialogDescription>
              Define the checklist items that will be added to jobs
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., HVAC Maintenance Checklist"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Checklist Items *</Label>
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      value={item}
                      onChange={(e) => handleItemChange(index, e.target.value)}
                      placeholder={`Item ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 flex-shrink-0"
                      onClick={() => handleRemoveItem(index)}
                      disabled={formData.items.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="gap-1 mt-2"
              >
                <Plus className="h-3 w-3" />
                Add Item
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this checklist template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
