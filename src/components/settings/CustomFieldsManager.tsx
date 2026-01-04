import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Check, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Dropdown' },
];

interface CustomField {
  id: string;
  name: string;
  field_type: string;
  is_required: boolean;
  options: string[] | null;
  created_at: string;
}

export function CustomFieldsManager() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('text');
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('text');
  const [editRequired, setEditRequired] = useState(false);
  const [editOptions, setEditOptions] = useState('');

  const { data: customFields, isLoading } = useQuery({
    queryKey: ['custom-field-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_field_definitions')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return data as CustomField[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (field: { name: string; field_type: string; is_required: boolean; options: string[] | null }) => {
      const { error } = await supabase
        .from('custom_field_definitions')
        .insert(field);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-definitions'] });
      resetCreateForm();
      toast.success('Custom field created');
    },
    onError: (error) => {
      toast.error('Failed to create custom field: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...field }: { id: string; name: string; field_type: string; is_required: boolean; options: string[] | null }) => {
      const { error } = await supabase
        .from('custom_field_definitions')
        .update(field)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-definitions'] });
      setEditingId(null);
      toast.success('Custom field updated');
    },
    onError: (error) => {
      toast.error('Failed to update custom field: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_field_definitions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-definitions'] });
      toast.success('Custom field deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete custom field: ' + error.message);
    }
  });

  const resetCreateForm = () => {
    setIsCreating(false);
    setNewName('');
    setNewType('text');
    setNewRequired(false);
    setNewOptions('');
  };

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error('Please enter a field name');
      return;
    }
    
    const options = newType === 'select' 
      ? newOptions.split(',').map(o => o.trim()).filter(Boolean)
      : null;
    
    if (newType === 'select' && (!options || options.length < 2)) {
      toast.error('Dropdown fields require at least 2 options');
      return;
    }

    createMutation.mutate({
      name: newName.trim(),
      field_type: newType,
      is_required: newRequired,
      options
    });
  };

  const startEdit = (field: CustomField) => {
    setEditingId(field.id);
    setEditName(field.name);
    setEditType(field.field_type);
    setEditRequired(field.is_required);
    setEditOptions(Array.isArray(field.options) ? field.options.join(', ') : '');
  };

  const handleUpdate = () => {
    if (!editingId || !editName.trim()) return;
    
    const options = editType === 'select'
      ? editOptions.split(',').map(o => o.trim()).filter(Boolean)
      : null;
    
    if (editType === 'select' && (!options || options.length < 2)) {
      toast.error('Dropdown fields require at least 2 options');
      return;
    }

    updateMutation.mutate({
      id: editingId,
      name: editName.trim(),
      field_type: editType,
      is_required: editRequired,
      options
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditType('text');
    setEditRequired(false);
    setEditOptions('');
  };

  const getFieldTypeLabel = (type: string) => {
    return FIELD_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Fields</CardTitle>
        <CardDescription>Define additional data fields that appear on job forms</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create new field form */}
        {isCreating ? (
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="field-name">Field Name</Label>
                <Input
                  id="field-name"
                  placeholder="e.g., Equipment Serial Number"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Field Type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {newType === 'select' && (
              <div className="space-y-1.5">
                <Label htmlFor="field-options">Options (comma-separated)</Label>
                <Input
                  id="field-options"
                  placeholder="e.g., Option 1, Option 2, Option 3"
                  value={newOptions}
                  onChange={(e) => setNewOptions(e.target.value)}
                />
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="field-required"
                  checked={newRequired}
                  onCheckedChange={setNewRequired}
                />
                <Label htmlFor="field-required">Required field</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetCreateForm}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Custom Field
          </Button>
        )}

        {/* List of custom fields */}
        <div className="space-y-2 pt-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : customFields?.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No custom fields yet. Add one to include extra data on job forms.
            </p>
          ) : (
            customFields?.map((field) => (
              <div
                key={field.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                {editingId === field.id ? (
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Field Name</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Field Type</Label>
                        <Select value={editType} onValueChange={setEditType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {editType === 'select' && (
                      <div className="space-y-1.5">
                        <Label>Options (comma-separated)</Label>
                        <Input
                          value={editOptions}
                          onChange={(e) => setEditOptions(e.target.value)}
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editRequired}
                          onCheckedChange={setEditRequired}
                        />
                        <Label>Required field</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={handleUpdate} disabled={updateMutation.isPending}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.name}</span>
                        {field.is_required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getFieldTypeLabel(field.field_type)}
                        </Badge>
                        {field.field_type === 'select' && Array.isArray(field.options) && (
                          <span className="text-xs text-muted-foreground">
                            {field.options.length} options
                          </span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(field)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(field.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
