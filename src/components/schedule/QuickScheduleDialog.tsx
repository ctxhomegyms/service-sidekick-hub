import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, User, Calendar, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { canScheduleJob, SchedulingConflict } from '@/lib/scheduling';
import { ConflictWarningDialog } from '@/components/scheduling/ConflictWarningDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UnassignedJob {
  id: string;
  title: string;
  customer_name: string | null;
  estimated_duration_minutes: number | null;
}

interface QuickScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technicianId: string;
  technicianName: string | null;
  date: Date;
  time: string;
  onScheduled: () => void;
}

const durationPresets = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
];

export function QuickScheduleDialog({
  open,
  onOpenChange,
  technicianId,
  technicianName,
  date,
  time,
  onScheduled,
}: QuickScheduleDialogProps) {
  const [unassignedJobs, setUnassignedJobs] = useState<UnassignedJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState(time);
  const [duration, setDuration] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUnassignedJobs();
      setSelectedTime(time);
      setSelectedJobId('');
      setDuration(60);
    }
  }, [open, time]);

  const fetchUnassignedJobs = async () => {
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

    const jobs = (data || []).map(j => ({
      id: j.id,
      title: j.title,
      customer_name: j.customer?.name || null,
      estimated_duration_minutes: j.estimated_duration_minutes,
    }));

    setUnassignedJobs(jobs);
  };

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = unassignedJobs.find(j => j.id === jobId);
    if (job?.estimated_duration_minutes) {
      setDuration(job.estimated_duration_minutes);
    }
  };

  const checkConflicts = async () => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const timeStr = `${selectedTime}:00`;
    
    const result = await canScheduleJob(
      technicianId,
      dateStr,
      timeStr,
      duration,
      selectedJobId
    );

    return result.conflicts;
  };

  const handleSchedule = async (forceOverride = false) => {
    if (!selectedJobId) {
      toast.error('Please select a job');
      return;
    }

    if (!forceOverride) {
      const conflictList = await checkConflicts();
      if (conflictList.length > 0) {
        setConflicts(conflictList);
        setShowConflictDialog(true);
        return;
      }
    }

    setIsLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const timeStr = `${selectedTime}:00`;

      const { error } = await supabase
        .from('jobs')
        .update({
          assigned_technician_id: technicianId,
          scheduled_date: dateStr,
          scheduled_time: timeStr,
          estimated_duration_minutes: duration,
          status: 'scheduled',
        })
        .eq('id', selectedJobId);

      if (error) throw error;

      toast.success('Job scheduled successfully');
      onOpenChange(false);
      onScheduled();
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule job');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeDisplay = (t: string) => {
    const [hours, minutes] = t.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  // Generate time options (15 min increments from 6 AM to 8 PM)
  const timeOptions = [];
  for (let h = 6; h < 21; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      timeOptions.push({ value, label: formatTimeDisplay(value) });
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Quick Schedule
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Pre-filled info */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{technicianName || 'Technician'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{format(date, 'MMM d, yyyy')}</span>
              </div>
            </div>

            {/* Job selector */}
            <div className="space-y-2">
              <Label>Select Job</Label>
              <ScrollArea className="h-[200px] border rounded-md">
                <div className="p-2 space-y-1">
                  {unassignedJobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No unassigned jobs available
                    </p>
                  ) : (
                    unassignedJobs.map(job => (
                      <div
                        key={job.id}
                        className={cn(
                          'p-3 rounded-md cursor-pointer transition-colors border',
                          selectedJobId === job.id
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted border-transparent'
                        )}
                        onClick={() => handleJobSelect(job.id)}
                      >
                        <div className="font-medium text-sm">{job.title}</div>
                        {job.customer_name && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {job.customer_name}
                          </div>
                        )}
                        {job.estimated_duration_minutes && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {job.estimated_duration_minutes} min
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Time selector */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duration</Label>
                <Select 
                  value={duration.toString()} 
                  onValueChange={(v) => setDuration(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durationPresets.map(preset => (
                      <SelectItem key={preset.value} value={preset.value.toString()}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleSchedule(false)} 
              disabled={!selectedJobId || isLoading}
            >
              {isLoading ? 'Scheduling...' : 'Schedule Job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConflictWarningDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        conflicts={conflicts}
        technicianName={technicianName || 'Technician'}
        onConfirm={() => {
          setShowConflictDialog(false);
          handleSchedule(true);
        }}
        onCancel={() => setShowConflictDialog(false)}
      />
    </>
  );
}
