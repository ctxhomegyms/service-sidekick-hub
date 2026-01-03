import { useMemo, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { CalendarJobCard } from './CalendarJobCard';
import { JobDetailPopover } from './JobDetailPopover';
import { cn } from '@/lib/utils';

type JobStatus = 'pending' | 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';

interface ScheduledJob {
  id: string;
  title: string;
  status: JobStatus;
  scheduled_date: string | null;
  scheduled_time: string | null;
  estimated_duration_minutes: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  customer: { 
    id?: string;
    name: string; 
    email?: string | null; 
    phone?: string | null;
  } | null;
  technician: { 
    id?: string;
    full_name: string | null; 
    avatar_url?: string | null;
    email?: string;
  } | null;
}

interface DayColumnProps {
  date: Date;
  jobs: ScheduledJob[];
  timeSlots: string[];
  slotHeight: number;
  startHour: number;
}

export function DayColumn({ date, jobs, timeSlots, slotHeight, startHour }: DayColumnProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const isToday = isSameDay(date, new Date());

  const dayJobs = useMemo(() => {
    return jobs.filter(
      (job) => job.scheduled_date && isSameDay(new Date(job.scheduled_date), date)
    );
  }, [jobs, date]);

  const allDayJobs = dayJobs.filter((job) => !job.scheduled_time);
  const timedJobs = dayJobs.filter((job) => job.scheduled_time);

  const getJobPosition = (job: ScheduledJob) => {
    if (!job.scheduled_time) return { top: 0, height: slotHeight };

    const [hours, minutes] = job.scheduled_time.split(':').map(Number);
    const startMinutes = (hours - startHour) * 60 + minutes;
    const duration = job.estimated_duration_minutes || 60;

    const top = (startMinutes / 60) * slotHeight;
    const height = Math.max((duration / 60) * slotHeight, slotHeight * 0.8);

    return { top, height };
  };

  return (
    <div className="flex-1 min-w-[140px]">
      {/* Day header */}
      <div
        className={cn(
          'sticky top-0 z-10 bg-background border-b p-2 text-center',
          isToday && 'bg-primary/5'
        )}
      >
        <div className="text-xs text-muted-foreground uppercase">
          {format(date, 'EEE')}
        </div>
        <div
          className={cn(
            'text-lg font-semibold',
            isToday && 'text-primary'
          )}
        >
          {format(date, 'd')}
        </div>
      </div>

      {/* All-day section */}
      <div className="border-b p-1 min-h-[40px] bg-muted/20">
        {allDayJobs.map((job) => (
          <JobDetailPopover
            key={job.id}
            job={job}
            open={selectedJobId === job.id}
            onOpenChange={(open) => setSelectedJobId(open ? job.id : null)}
          >
            <div>
              <CalendarJobCard
                job={job}
                onClick={() => setSelectedJobId(job.id)}
                compact
              />
            </div>
          </JobDetailPopover>
        ))}
      </div>

      {/* Time slots */}
      <div className="relative">
        {/* Grid lines */}
        {timeSlots.map((_, index) => (
          <div
            key={index}
            className="border-b border-dashed border-muted"
            style={{ height: slotHeight }}
          />
        ))}

        {/* Positioned jobs */}
        <div className="absolute inset-0 p-1">
          {timedJobs.map((job) => {
            const { top, height } = getJobPosition(job);
            return (
              <JobDetailPopover
                key={job.id}
                job={job}
                open={selectedJobId === job.id}
                onOpenChange={(open) => setSelectedJobId(open ? job.id : null)}
              >
                <div
                  className="absolute left-1 right-1"
                  style={{ top, height: height - 4 }}
                >
                  <CalendarJobCard
                    job={job}
                    onClick={() => setSelectedJobId(job.id)}
                    compact={height < slotHeight * 1.5}
                  />
                </div>
              </JobDetailPopover>
            );
          })}
        </div>
      </div>
    </div>
  );
}
