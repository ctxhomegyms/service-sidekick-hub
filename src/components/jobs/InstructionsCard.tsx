import { useState } from 'react';
import { Pencil, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InstructionsCardProps {
  job: {
    id: string;
    instructions: string | null;
    description: string | null;
  };
  onUpdate: () => void;
}

export function InstructionsCard({ job, onUpdate }: InstructionsCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [instructions, setInstructions] = useState(job.instructions || '');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ instructions: instructions || null })
        .eq('id', job.id);

      if (error) throw error;

      toast.success('Instructions updated');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating instructions:', error);
      toast.error('Failed to update instructions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setInstructions(job.instructions || '');
    setIsEditing(false);
  };

  const displayText = job.instructions || job.description || 'No instructions set';

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Instructions</h3>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
              <X className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Check className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </div>

      {isEditing ? (
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Enter job instructions..."
          rows={4}
        />
      ) : (
        <p className="text-muted-foreground whitespace-pre-wrap">{displayText}</p>
      )}
    </div>
  );
}
