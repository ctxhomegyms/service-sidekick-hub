import { useState } from 'react';
import { format } from 'date-fns';
import { Send, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  note_text: string;
  created_at: string;
  author?: {
    full_name: string | null;
  };
}

interface JobNotesProps {
  jobId: string;
  notes: Note[];
  onNoteAdded?: () => void;
  readOnly?: boolean;
}

export function JobNotes({ jobId, notes, onNoteAdded, readOnly = false }: JobNotesProps) {
  const { user } = useAuth();
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newNote.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('job_notes')
        .insert({
          job_id: jobId,
          author_id: user.id,
          note_text: newNote.trim(),
        });

      if (error) throw error;

      setNewNote('');
      toast.success('Note added');
      onNoteAdded?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add note');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Notes list */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notes yet</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="bg-muted/50 rounded-lg p-3 space-y-1"
            >
              <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{note.author?.full_name || 'Unknown'}</span>
                <span>{format(new Date(note.created_at), 'MMM d, h:mm a')}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add note form */}
      {!readOnly && (
        <div className="flex gap-2">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className="min-h-[60px] resize-none"
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!newNote.trim() || isSubmitting}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
