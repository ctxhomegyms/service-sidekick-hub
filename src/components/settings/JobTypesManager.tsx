import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const PRESET_COLORS = [
  '#6B7280', '#EF4444', '#F97316', '#F59E0B', '#84CC16',
  '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E'
];

interface JobType {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export function JobTypesManager() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const { data: jobTypes, isLoading } = useQuery({
    queryKey: ['job-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as JobType[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { error } = await supabase
        .from('job_types')
        .insert({ name, color });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-types'] });
      setNewName('');
      setNewColor('#3B82F6');
      toast.success('Job type created');
    },
    onError: (error) => {
      toast.error('Failed to create job type: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { error } = await supabase
        .from('job_types')
        .update({ name, color })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-types'] });
      setEditingId(null);
      toast.success('Job type updated');
    },
    onError: (error) => {
      toast.error('Failed to update job type: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('job_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-types'] });
      toast.success('Job type deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete job type: ' + error.message);
    }
  });

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error('Please enter a name');
      return;
    }
    createMutation.mutate({ name: newName.trim(), color: newColor });
  };

  const startEdit = (jobType: JobType) => {
    setEditingId(jobType.id);
    setEditName(jobType.name);
    setEditColor(jobType.color || '#6B7280');
  };

  const handleUpdate = () => {
    if (!editingId || !editName.trim()) return;
    updateMutation.mutate({ id: editingId, name: editName.trim(), color: editColor });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Types</CardTitle>
        <CardDescription>Create and manage job types with custom colors</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create new job type */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="new-job-type">New Job Type</Label>
            <Input
              id="new-job-type"
              placeholder="e.g., Installation, Repair, Maintenance"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-1">
              {PRESET_COLORS.slice(0, 5).map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-md border-2 transition-all ${
                    newColor === color ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewColor(color)}
                />
              ))}
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-8 h-8 rounded-md cursor-pointer border-0 p-0"
              />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* List of job types */}
        <div className="space-y-2 pt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : jobTypes?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No job types yet. Create one above.</p>
          ) : (
            jobTypes?.map((jobType) => (
              <div
                key={jobType.id}
                className="flex items-center gap-2 p-2 rounded-lg border bg-card"
              >
                {editingId === jobType.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      {PRESET_COLORS.slice(0, 5).map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-6 h-6 rounded border-2 transition-all ${
                            editColor === color ? 'border-foreground scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setEditColor(color)}
                        />
                      ))}
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                      />
                    </div>
                    <Button size="sm" variant="ghost" onClick={handleUpdate}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: jobType.color || '#6B7280' }}
                    />
                    <span className="flex-1 font-medium">{jobType.name}</span>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(jobType)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(jobType.id)}
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
