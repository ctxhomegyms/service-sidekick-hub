import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Search, Clock, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { canScheduleJob } from '@/lib/scheduling';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UnassignedJob {
  id: string;
  title: string;
  customer_name: string | null;
  estimated_duration_minutes: number | null;
}

interface QuickAssignPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technicianId: string;
  technicianName: string | null;
  date: Date;
  time: string;
  onScheduled: () => void;
}

export function QuickAssignPopover({
  open,
  onOpenChange,
  technicianId,
  technicianName,
  date,
  time,
  onScheduled,
}: QuickAssignPopoverProps) {
  const [jobs, setJobs] = useState<UnassignedJob[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [schedulingJobId, setSchedulingJobId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetchUnassignedJobs();
      setSearchQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  const fetchUnassignedJobs = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('jobs')
        .select(`
          id, 
          title, 
          estimated_duration_minutes,
          customer:customers(name)
        `)
        .is('assigned_technician_id', null)
        .not('status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: false })
        .limit(50);

      const mappedJobs = (data || []).map(j => ({
        id: j.id,
        title: j.title,
        customer_name: j.customer?.name || null,
        estimated_duration_minutes: j.estimated_duration_minutes,
      }));

      setJobs(mappedJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobClick = async (job: UnassignedJob) => {
    setSchedulingJobId(job.id);
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const timeStr = `${time}:00`;
    const duration = job.estimated_duration_minutes || 60;

    try {
      const result = await canScheduleJob(
        technicianId,
        dateStr,
        timeStr,
        duration,
        job.id
      );

      if (result.conflicts.length > 0) {
        toast.warning(
          `Conflict with ${result.conflicts[0].job_title} at ${formatTimeDisplay(result.conflicts[0].scheduled_time)}`,
          { duration: 3000 }
        );
      }

      const { error } = await supabase
        .from('jobs')
        .update({
          assigned_technician_id: technicianId,
          scheduled_date: dateStr,
          scheduled_time: timeStr,
          estimated_duration_minutes: duration,
          status: 'scheduled',
        })
        .eq('id', job.id);

      if (error) throw error;

      toast.success(`Scheduled: ${job.title}`);
      onOpenChange(false);
      onScheduled();
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule job');
    } finally {
      setSchedulingJobId(null);
    }
  };

  const formatTimeDisplay = (t: string) => {
    if (!t) return '';
    const [hours, minutes] = t.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const filteredJobs = jobs.filter(job => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.title.toLowerCase().includes(query) ||
      (job.customer_name?.toLowerCase().includes(query) ?? false)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b bg-muted/30">
          <DialogTitle className="text-base font-semibold">
            Schedule Job
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatTimeDisplay(time)}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {format(date, 'MMM d')}
            </span>
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {technicianName || 'Technician'}
            </span>
          </div>
        </DialogHeader>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search unassigned jobs..."
              className="pl-8 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Job List */}
        <ScrollArea className="max-h-[320px]">
          <div className="p-2">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading jobs...
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No matching jobs' : 'No unassigned jobs available'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a new job first, then schedule it here
                </p>
              </div>
            ) : (
              filteredJobs.map((job) => (
                <button
                  key={job.id}
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-colors mb-1',
                    'hover:bg-accent focus:bg-accent focus:outline-none',
                    'border border-transparent hover:border-border',
                    schedulingJobId === job.id && 'opacity-50 pointer-events-none'
                  )}
                  onClick={() => handleJobClick(job)}
                  disabled={schedulingJobId === job.id}
                >
                  <div className="font-medium text-sm">
                    {job.title}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs text-muted-foreground truncate">
                      {job.customer_name || 'No customer'}
                    </span>
                    {job.estimated_duration_minutes && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {job.estimated_duration_minutes}m
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
