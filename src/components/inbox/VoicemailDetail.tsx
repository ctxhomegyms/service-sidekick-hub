import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Voicemail,
  Play,
  Pause,
  Check,
  Archive,
  Phone,
  Clock,
  User,
  FileText,
  X,
  Loader2,
  MessageSquare
} from 'lucide-react';

interface VoicemailRecord {
  id: string;
  caller_phone: string;
  recording_url: string | null;
  transcription: string | null;
  duration_seconds: number | null;
  is_listened: boolean;
  is_archived: boolean;
  created_at: string;
  customer_id: string | null;
  customer?: {
    id: string;
    name: string;
  } | null;
}

interface VoicemailDetailProps {
  voicemailId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function VoicemailDetail({ voicemailId, onClose, onUpdate }: VoicemailDetailProps) {
  const { user } = useAuth();
  const [voicemail, setVoicemail] = useState<VoicemailRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchVoicemailDetails();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [voicemailId]);

  const fetchVoicemailDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('voicemails')
        .select(`
          *,
          customer:customers(id, name)
        `)
        .eq('id', voicemailId)
        .single();

      if (error) throw error;
      setVoicemail(data);
    } catch (error) {
      console.error('Error fetching voicemail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const markAsListened = async () => {
    if (!voicemail) return;
    try {
      const { error } = await supabase
        .from('voicemails')
        .update({ 
          is_listened: true, 
          listened_at: new Date().toISOString(),
          listened_by: user?.id 
        })
        .eq('id', voicemail.id);

      if (error) throw error;
      
      setVoicemail({ ...voicemail, is_listened: true });
      onUpdate();
    } catch (error) {
      console.error('Error marking voicemail as listened:', error);
    }
  };

  const archiveVoicemail = async () => {
    if (!voicemail) return;
    try {
      const { error } = await supabase
        .from('voicemails')
        .update({ is_archived: true })
        .eq('id', voicemail.id);

      if (error) throw error;
      
      toast.success('Voicemail archived');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error archiving voicemail:', error);
      toast.error('Failed to archive voicemail');
    }
  };

  const togglePlay = () => {
    if (!voicemail?.recording_url) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(voicemail.recording_url);
      audioRef.current.play();
      audioRef.current.onended = () => setIsPlaying(false);
      setIsPlaying(true);
      
      if (!voicemail.is_listened) {
        markAsListened();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!voicemail) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Voicemail not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-muted">
            <Voicemail className="h-6 w-6 text-warning" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Voicemail</h2>
              {!voicemail.is_listened && (
                <Badge variant="default">New</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(voicemail.created_at), 'MMM d, yyyy at h:mm a')}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Caller Info */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <User className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            {voicemail.customer ? (
              <>
                <Link 
                  to={`/customers/${voicemail.customer.id}`}
                  className="font-semibold text-lg hover:underline"
                >
                  {voicemail.customer.name}
                </Link>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {formatPhone(voicemail.caller_phone)}
                </p>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-lg">Unknown Caller</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {formatPhone(voicemail.caller_phone)}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Voicemail Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Duration</p>
            <p className="font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDuration(voicemail.duration_seconds)}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Status</p>
            <Badge variant={voicemail.is_listened ? "secondary" : "default"}>
              {voicemail.is_listened ? 'Listened' : 'New'}
            </Badge>
          </div>
        </div>

        {/* Audio Player */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex gap-2">
            <Button
              onClick={togglePlay}
              disabled={!voicemail.recording_url}
              className="flex-1"
              variant={isPlaying ? "default" : "outline"}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Play ({formatDuration(voicemail.duration_seconds)})
                </>
              )}
            </Button>
            {!voicemail.is_listened && (
              <Button
                variant="outline"
                onClick={markAsListened}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark Listened
              </Button>
            )}
          </div>
        </div>

        {/* Transcription */}
        {voicemail.transcription && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transcription
            </h4>
            <p className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
              {voicemail.transcription}
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-4 border-t space-y-2">
          <p className="text-sm font-medium mb-3">Quick Actions</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-2" />
              Send SMS
            </Button>
            <Button variant="outline" className="flex-1">
              <Phone className="h-4 w-4 mr-2" />
              Call Back
            </Button>
            {!voicemail.is_archived && (
              <Button
                variant="outline"
                onClick={archiveVoicemail}
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
