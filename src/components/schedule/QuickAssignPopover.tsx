import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Search, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  children?: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

export function QuickAssignPopover({
  open,
  onOpenChange,
  technicianId,
  technicianName,
  date,
  time,
  onScheduled,
  children,
  side = 'right',
  align = 'start',
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
      // Focus search input when popover opens
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
      // Check for conflicts
      const result = await canScheduleJob(
        technicianId,
        dateStr,
        timeStr,
        duration,
        job.id
      );

      if (result.conflicts.length > 0) {
        // Show brief conflict warning
        toast.warning(
          `Conflict with ${result.conflicts[0].job_title} at ${formatTimeDisplay(result.conflicts[0].scheduled_time)}`,
          { duration: 3000 }
        );
      }

      // Schedule the job
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
    <Popover open={open} onOpenChange={onOpenChange}>
      {children && <PopoverTrigger asChild>{children}</PopoverTrigger>}
      <PopoverContent
        side={side}
        align={align}
        className="w-72 p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b bg-muted/30">
          <div className="text-sm font-medium text-foreground">
            {formatTimeDisplay(time)} · {technicianName || 'Technician'}
          </div>
          <div className="text-xs text-muted-foreground">
            {format(date, 'EEEE, MMM d')}
          </div>
        </div>

        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search jobs..."
              className="pl-8 h-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Job List */}
        <ScrollArea className="max-h-[280px]">
          <div className="p-1">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading jobs...
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {searchQuery ? 'No matching jobs' : 'No unassigned jobs'}
              </div>
            ) : (
              filteredJobs.map((job) => (
                <button
                  key={job.id}
                  className={cn(
                    'w-full text-left p-2.5 rounded-md transition-colors',
                    'hover:bg-accent/10 focus:bg-accent/10 focus:outline-none',
                    schedulingJobId === job.id && 'opacity-50 pointer-events-none'
                  )}
                  onClick={() => handleJobClick(job)}
                  disabled={schedulingJobId === job.id}
                >
                  <div className="font-medium text-sm truncate">
                    {job.title}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
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

        {/* Footer hint */}
        <div className="px-3 py-2 border-t bg-muted/20">
          <p className="text-[10px] text-muted-foreground text-center">
            Click a job to schedule instantly
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
