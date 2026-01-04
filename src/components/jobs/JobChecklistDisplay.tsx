import { useState } from 'react';
import { Check, Square, CheckSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  id: string;
  item_text: string;
  item_type: string;
  is_required: boolean;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
}

interface JobChecklistDisplayProps {
  jobId: string;
  items: ChecklistItem[];
  onUpdate: () => void;
}

export function JobChecklistDisplay({ jobId, items, onUpdate }: JobChecklistDisplayProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  const sortedItems = [...items].sort((a, b) => a.sort_order - b.sort_order);
  const completedCount = items.filter(i => i.is_completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleToggle = async (item: ChecklistItem) => {
    setUpdating(item.id);
    try {
      const { error } = await supabase
        .from('job_checklist_items')
        .update({
          is_completed: !item.is_completed,
          completed_at: !item.is_completed ? new Date().toISOString() : null,
        })
        .eq('id', item.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error updating checklist item:', error);
      toast.error('Failed to update checklist item');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Checklist</h3>
        <span className="text-sm text-muted-foreground">
          {completedCount} of {totalCount} completed
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full mb-4 overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-2">
        {sortedItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleToggle(item)}
            disabled={updating === item.id}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
              item.is_completed 
                ? "bg-muted/50 border-muted" 
                : "hover:bg-muted/30",
              updating === item.id && "opacity-50"
            )}
          >
            {item.is_completed ? (
              <CheckSquare className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            ) : (
              <Square className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <span className={cn(
                "block",
                item.is_completed && "line-through text-muted-foreground"
              )}>
                {item.item_text}
              </span>
              {item.is_required && !item.is_completed && (
                <span className="text-xs text-destructive">Required</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
