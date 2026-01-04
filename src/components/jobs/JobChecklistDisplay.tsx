import { useState } from 'react';
import { Check, Square, CheckSquare, Image, FileSignature, MessageSquare, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ChecklistItem {
  id: string;
  item_text: string;
  item_type: string;
  is_required: boolean;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  sort_order: number;
  image_url: string | null;
  signature_url: string | null;
  response_text: string | null;
  response_value: unknown;
  options: unknown;
}

interface JobChecklistDisplayProps {
  jobId: string;
  items: ChecklistItem[];
  onUpdate: () => void;
  readOnly?: boolean;
}

export function JobChecklistDisplay({ jobId, items, onUpdate, readOnly = false }: JobChecklistDisplayProps) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const sortedItems = [...items].sort((a, b) => a.sort_order - b.sort_order);
  const completedCount = items.filter(i => i.is_completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleToggle = async (item: ChecklistItem) => {
    if (readOnly) return;
    
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

  const hasAttachments = (item: ChecklistItem) => {
    return item.image_url || item.signature_url || item.response_text || item.response_value;
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'checkbox': return null;
      case 'text': return 'Text Response';
      case 'number': return 'Number';
      case 'photo': return 'Photo Required';
      case 'signature': return 'Signature Required';
      case 'select': return 'Selection';
      case 'multiselect': return 'Multiple Selection';
      default: return type;
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
        {sortedItems.map((item) => {
          const hasData = hasAttachments(item);
          const isExpanded = expandedItems.has(item.id);
          const typeLabel = getItemTypeLabel(item.item_type);

          return (
            <div
              key={item.id}
              className={cn(
                "rounded-lg border transition-colors",
                item.is_completed 
                  ? "bg-muted/50 border-muted" 
                  : "hover:bg-muted/30",
              )}
            >
              {/* Main row */}
              <div
                className={cn(
                  "flex items-start gap-3 p-3",
                  !readOnly && "cursor-pointer",
                  updating === item.id && "opacity-50"
                )}
                onClick={() => !readOnly && handleToggle(item)}
              >
                {item.is_completed ? (
                  <CheckSquare className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      item.is_completed && "line-through text-muted-foreground"
                    )}>
                      {item.item_text}
                    </span>
                    {typeLabel && (
                      <Badge variant="outline" className="text-xs">
                        {typeLabel}
                      </Badge>
                    )}
                  </div>
                  {item.is_required && !item.is_completed && (
                    <span className="text-xs text-destructive">Required</span>
                  )}
                  {item.completed_at && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Completed {format(new Date(item.completed_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  )}
                </div>

                {/* Attachment indicators */}
                <div className="flex items-center gap-1 shrink-0">
                  {item.image_url && (
                    <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center">
                      <Image className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                  )}
                  {item.signature_url && (
                    <div className="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center">
                      <FileSignature className="w-3.5 h-3.5 text-purple-500" />
                    </div>
                  )}
                  {(item.response_text || item.response_value) && (
                    <div className="w-6 h-6 rounded bg-green-500/10 flex items-center justify-center">
                      <MessageSquare className="w-3.5 h-3.5 text-green-500" />
                    </div>
                  )}
                  {hasData && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(item.id);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded content with attachments */}
              {hasData && isExpanded && (
                <div className="px-3 pb-3 pt-0 border-t border-border/50 mt-0">
                  <div className="pt-3 space-y-4">
                    {/* Response text */}
                    {item.response_text && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Response
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                          {item.response_text}
                        </div>
                      </div>
                    )}

                    {/* Response value (for selects, numbers, etc.) */}
                    {item.response_value && !item.response_text && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Value
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                          {typeof item.response_value === 'object' 
                            ? JSON.stringify(item.response_value, null, 2)
                            : String(item.response_value)
                          }
                        </div>
                      </div>
                    )}

                    {/* Image */}
                    {item.image_url && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Image className="w-3 h-3" />
                          Photo
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="block rounded-lg overflow-hidden border hover:opacity-90 transition-opacity cursor-zoom-in">
                              <img 
                                src={item.image_url} 
                                alt="Checklist item photo"
                                className="max-h-48 w-auto object-contain"
                              />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl p-2">
                            <img 
                              src={item.image_url} 
                              alt="Checklist item photo"
                              className="w-full h-auto rounded-lg"
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}

                    {/* Signature */}
                    {item.signature_url && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <FileSignature className="w-3 h-3" />
                          Signature
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="block bg-white rounded-lg overflow-hidden border p-2 hover:opacity-90 transition-opacity cursor-zoom-in">
                              <img 
                                src={item.signature_url} 
                                alt="Signature"
                                className="max-h-32 w-auto"
                              />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl p-4 bg-white">
                            <div className="text-center space-y-4">
                              <h3 className="font-semibold text-foreground">Signature</h3>
                              <img 
                                src={item.signature_url} 
                                alt="Signature"
                                className="max-w-full h-auto mx-auto border rounded-lg p-4"
                              />
                              {item.completed_at && (
                                <p className="text-sm text-muted-foreground">
                                  Signed on {format(new Date(item.completed_at), 'MMMM d, yyyy at h:mm a')}
                                </p>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary of attachments */}
      {items.some(hasAttachments) && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium">Attachments:</span>
            {items.filter(i => i.image_url).length > 0 && (
              <span className="flex items-center gap-1">
                <Image className="w-3 h-3 text-blue-500" />
                {items.filter(i => i.image_url).length} photo{items.filter(i => i.image_url).length !== 1 ? 's' : ''}
              </span>
            )}
            {items.filter(i => i.signature_url).length > 0 && (
              <span className="flex items-center gap-1">
                <FileSignature className="w-3 h-3 text-purple-500" />
                {items.filter(i => i.signature_url).length} signature{items.filter(i => i.signature_url).length !== 1 ? 's' : ''}
              </span>
            )}
            {items.filter(i => i.response_text || i.response_value).length > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-green-500" />
                {items.filter(i => i.response_text || i.response_value).length} response{items.filter(i => i.response_text || i.response_value).length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
