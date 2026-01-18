import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed,
  Search, 
  Clock, 
  User,
  Loader2,
  Play,
  Voicemail
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
  customer?: {
    id: string;
    name: string;
  } | null;
  answered_by_profile?: {
    id: string;
    full_name: string | null;
  } | null;
}

export default function CallLog() {
  const [calls, setCalls] = useState<CallLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchCalls();
  }, [directionFilter, statusFilter]);

  const fetchCalls = async () => {
    try {
      let query = supabase
        .from('call_log')
        .select(`
          *,
          customer:customers(id, name),
          answered_by_profile:profiles!call_log_answered_by_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (directionFilter === 'inbound' || directionFilter === 'outbound') {
        query = query.eq('direction', directionFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error('Error fetching call log:', error);
      toast.error('Failed to load call log');
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
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'no-answer':
      case 'missed':
        return <Badge variant="destructive">Missed</Badge>;
      case 'voicemail':
        return <Badge variant="secondary">Voicemail</Badge>;
      case 'busy':
        return <Badge variant="outline">Busy</Badge>;
      case 'ringing':
        return <Badge variant="outline">Ringing</Badge>;
      case 'in-progress':
        return <Badge variant="default">In Progress</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDirectionIcon = (direction: 'inbound' | 'outbound', status: string) => {
    if (status === 'missed' || status === 'no-answer') {
      return <PhoneMissed className="h-4 w-4 text-destructive" />;
    }
    if (direction === 'inbound') {
      return <PhoneIncoming className="h-4 w-4 text-green-500" />;
    }
    return <PhoneOutgoing className="h-4 w-4 text-blue-500" />;
  };

  const filteredCalls = calls.filter((call) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      call.from_number.includes(query) ||
      call.to_number.includes(query) ||
      call.customer?.name?.toLowerCase().includes(query)
    );
  });

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Phone className="h-8 w-8" />
            Call Log
          </h1>
          <p className="text-muted-foreground">View all incoming and outgoing calls</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by phone or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={directionFilter} onValueChange={setDirectionFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Directions</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="missed">Missed</SelectItem>
              <SelectItem value="no-answer">No Answer</SelectItem>
              <SelectItem value="voicemail">Voicemail</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Calls</CardTitle>
            <CardDescription>
              {filteredCalls.length} call{filteredCalls.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Phone className="h-12 w-12 mb-4 opacity-50" />
                <p>No calls found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Caller / Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Answered By</TableHead>
                    <TableHead>Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell>
                        {getDirectionIcon(call.direction, call.status)}
                      </TableCell>
                      <TableCell>
                        {call.customer ? (
                          <Link 
                            to={`/customers/${call.customer.id}`}
                            className="font-medium hover:underline"
                          >
                            {call.customer.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatPhone(call.direction === 'inbound' ? call.from_number : call.to_number)}
                      </TableCell>
                      <TableCell>{getStatusBadge(call.status)}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDuration(call.duration_seconds)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {call.answered_by_profile?.full_name || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(call.created_at), 'MMM d, h:mm a')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
