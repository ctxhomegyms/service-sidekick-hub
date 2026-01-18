import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Voicemail, 
  Play, 
  Pause, 
  Check, 
  Archive, 
  Search, 
  Phone, 
  Clock, 
  User,
  Loader2,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

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

export default function Voicemails() {
  const { user } = useAuth();
  const [voicemails, setVoicemails] = useState<VoicemailRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedVoicemail, setSelectedVoicemail] = useState<VoicemailRecord | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchVoicemails();
  }, [showArchived]);

  const fetchVoicemails = async () => {
    try {
      let query = supabase
        .from('voicemails')
        .select(`
          *,
          customer:customers(id, name)
        `)
        .eq('is_archived', showArchived)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setVoicemails(data || []);
    } catch (error) {
      console.error('Error fetching voicemails:', error);
      toast.error('Failed to load voicemails');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsListened = async (id: string) => {
    try {
      const { error } = await supabase
        .from('voicemails')
        .update({ 
          is_listened: true, 
          listened_at: new Date().toISOString(),
          listened_by: user?.id 
        })
        .eq('id', id);

      if (error) throw error;
      
      setVoicemails((prev) =>
        prev.map((v) => (v.id === id ? { ...v, is_listened: true } : v))
      );
    } catch (error) {
      console.error('Error marking voicemail as listened:', error);
    }
  };

  const archiveVoicemail = async (id: string) => {
    try {
      const { error } = await supabase
        .from('voicemails')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;
      
      setVoicemails((prev) => prev.filter((v) => v.id !== id));
      if (selectedVoicemail?.id === id) {
        setSelectedVoicemail(null);
      }
      toast.success('Voicemail archived');
    } catch (error) {
      console.error('Error archiving voicemail:', error);
      toast.error('Failed to archive voicemail');
    }
  };

  const togglePlay = (voicemail: VoicemailRecord) => {
    if (!voicemail.recording_url) return;

    if (playingId === voicemail.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(voicemail.recording_url);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingId(null);
      setPlayingId(voicemail.id);
      
      if (!voicemail.is_listened) {
        markAsListened(voicemail.id);
      }
    }
    setSelectedVoicemail(voicemail);
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

  const filteredVoicemails = voicemails.filter((v) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.caller_phone.includes(query) ||
      v.customer?.name?.toLowerCase().includes(query) ||
      v.transcription?.toLowerCase().includes(query)
    );
  });

  const unlistenedCount = voicemails.filter((v) => !v.is_listened).length;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Voicemail className="h-8 w-8" />
              Voicemails
              {unlistenedCount > 0 && (
                <Badge variant="destructive">{unlistenedCount} new</Badge>
              )}
            </h1>
            <p className="text-muted-foreground">Listen and manage voicemail messages</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'Show Active' : 'Show Archived'}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search voicemails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Voicemail List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {showArchived ? 'Archived' : 'Active'} Voicemails
              </CardTitle>
              <CardDescription>
                {filteredVoicemails.length} message{filteredVoicemails.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {filteredVoicemails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Voicemail className="h-12 w-12 mb-4 opacity-50" />
                    <p>No voicemails found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredVoicemails.map((voicemail) => (
                      <div
                        key={voicemail.id}
                        className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                          selectedVoicemail?.id === voicemail.id ? 'bg-muted' : ''
                        } ${!voicemail.is_listened ? 'border-l-4 border-l-primary' : ''}`}
                        onClick={() => setSelectedVoicemail(voicemail)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {voicemail.customer ? (
                                <Link 
                                  to={`/customers/${voicemail.customer.id}`}
                                  className="font-medium hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {voicemail.customer.name}
                                </Link>
                              ) : (
                                <span className="font-medium">
                                  {formatPhone(voicemail.caller_phone)}
                                </span>
                              )}
                              {!voicemail.is_listened && (
                                <Badge variant="default" className="text-xs">New</Badge>
                              )}
                            </div>
                            {voicemail.customer && (
                              <p className="text-sm text-muted-foreground">
                                {formatPhone(voicemail.caller_phone)}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(voicemail.created_at), 'MMM d, h:mm a')}
                              </span>
                              <span>{formatDuration(voicemail.duration_seconds)}</span>
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant={playingId === voicemail.id ? 'default' : 'outline'}
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlay(voicemail);
                            }}
                            disabled={!voicemail.recording_url}
                          >
                            {playingId === voicemail.id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {voicemail.transcription && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {voicemail.transcription}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Voicemail Detail */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Voicemail Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedVoicemail ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {selectedVoicemail.customer?.name || 'Unknown Caller'}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {formatPhone(selectedVoicemail.caller_phone)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => togglePlay(selectedVoicemail)}
                      disabled={!selectedVoicemail.recording_url}
                      className="flex-1"
                    >
                      {playingId === selectedVoicemail.id ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Play ({formatDuration(selectedVoicemail.duration_seconds)})
                        </>
                      )}
                    </Button>
                    {!selectedVoicemail.is_listened && (
                      <Button
                        variant="outline"
                        onClick={() => markAsListened(selectedVoicemail.id)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark Listened
                      </Button>
                    )}
                    {!showArchived && (
                      <Button
                        variant="outline"
                        onClick={() => archiveVoicemail(selectedVoicemail.id)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {selectedVoicemail.transcription && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Transcription
                      </h4>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                        {selectedVoicemail.transcription}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Received {format(new Date(selectedVoicemail.created_at), 'MMMM d, yyyy at h:mm a')}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Voicemail className="h-12 w-12 mb-4 opacity-50" />
                  <p>Select a voicemail to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
