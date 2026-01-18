import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  User,
  Play,
  Pause,
  MessageSquare,
  X,
  Loader2
} from 'lucide-react';

interface CallLogRecord {
  id: string;
  from_number: string;
  to_number: string;
  direction: 'inbound' | 'outbound';
  status: string;
  duration_seconds: number | null;
  created_at: string;
  ended_at: string | null;
  customer_id: string | null;
  answered_by: string | null;
  call_sid: string | null;
  customer?: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  answered_by_profile?: {
    id: string;
    full_name: string | null;
  } | null;
}

interface CallRecording {
  id: string;
  recording_url: string;
  duration_seconds: number | null;
}

interface CallDetailProps {
  callId: string;
  onClose: () => void;
}

export default function CallDetail({ callId, onClose }: CallDetailProps) {
  const [call, setCall] = useState<CallLogRecord | null>(null);
  const [recording, setRecording] = useState<CallRecording | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchCallDetails();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [callId]);

  const fetchCallDetails = async () => {
    try {
      const { data: callData, error: callError } = await supabase
        .from('call_log')
        .select(`
          *,
          customer:customers(id, name, phone),
          answered_by_profile:profiles!call_log_answered_by_fkey(id, full_name)
        `)
        .eq('id', callId)
        .single();

      if (callError) throw callError;
      setCall(callData);

      // Try to fetch recording if available
      if (callData?.call_sid) {
        const { data: recordingData } = await supabase
          .from('call_recordings')
          .select('id, recording_url, duration_seconds')
          .eq('call_sid', callData.call_sid)
          .maybeSingle();

        if (recordingData) {
          setRecording(recordingData);
        }
      }
    } catch (error) {
      console.error('Error fetching call details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case 'no-answer':
      case 'missed':
        return <Badge variant="destructive">Missed</Badge>;
      case 'voicemail':
        return <Badge variant="secondary">Voicemail</Badge>;
      case 'busy':
        return <Badge variant="outline">Busy</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDirectionIcon = () => {
    if (!call) return null;
    if (call.status === 'missed' || call.status === 'no-answer') {
      return <PhoneMissed className="h-6 w-6 text-destructive" />;
    }
    if (call.direction === 'inbound') {
      return <PhoneIncoming className="h-6 w-6 text-green-500" />;
    }
    return <PhoneOutgoing className="h-6 w-6 text-blue-500" />;
  };

  const togglePlayRecording = () => {
    if (!recording?.recording_url) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(recording.recording_url);
      audioRef.current.play();
      audioRef.current.onended = () => setIsPlaying(false);
      setIsPlaying(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Call not found</p>
      </div>
    );
  }

  const phoneNumber = call.direction === 'inbound' ? call.from_number : call.to_number;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-muted">
            {getDirectionIcon()}
          </div>
          <div>
            <h2 className="font-semibold">
              {call.direction === 'inbound' ? 'Incoming Call' : 'Outgoing Call'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {format(new Date(call.created_at), 'MMM d, yyyy at h:mm a')}
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
            {call.customer ? (
              <>
                <Link 
                  to={`/customers/${call.customer.id}`}
                  className="font-semibold text-lg hover:underline"
                >
                  {call.customer.name}
                </Link>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {formatPhone(phoneNumber)}
                </p>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-lg">Unknown Caller</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {formatPhone(phoneNumber)}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Call Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Status</p>
            {getStatusBadge(call.status)}
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Duration</p>
            <p className="font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDuration(call.duration_seconds)}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Direction</p>
            <p className="font-medium capitalize">{call.direction}</p>
          </div>
          {call.answered_by_profile && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Answered By</p>
              <p className="font-medium">{call.answered_by_profile.full_name}</p>
            </div>
          )}
        </div>

        {/* Recording Player */}
        {recording && (
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-3">Call Recording</p>
            <Button
              onClick={togglePlayRecording}
              variant={isPlaying ? "default" : "outline"}
              className="w-full"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Recording
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Play Recording ({formatDuration(recording.duration_seconds)})
                </>
              )}
            </Button>
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
          </div>
        </div>
      </div>
    </div>
  );
}
