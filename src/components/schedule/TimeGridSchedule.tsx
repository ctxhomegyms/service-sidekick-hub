import { useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TechnicianColumn } from './TechnicianColumn';
import { cn } from '@/lib/utils';

type JobStatus = 'pending' | 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface ScheduledJob {
  id: string;
  title: string;
  description: string | null;
  status: JobStatus;
  priority: Priority;
  scheduled_date: string | null;
  scheduled_time: string | null;
  estimated_duration_minutes: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  assigned_technician_id: string | null;
  latitude: number | null;
  longitude: number | null;
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
  } | null;
}

export interface Technician {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface TimeGridScheduleProps {
  date: Date;
  technicians: Technician[];
  jobs: ScheduledJob[];
  onSlotClick: (technicianId: string, time: string) => void;
  onJobClick: (job: ScheduledJob) => void;
  startHour?: number;
  endHour?: number;
}

export function TimeGridSchedule({
  date,
  technicians,
  jobs,
  onSlotClick,
  onJobClick,
  startHour = 6,
  endHour = 20,
}: TimeGridScheduleProps) {
  const slotHeight = 60; // pixels per hour
  const totalHours = endHour - startHour;
  
  const timeLabels = useMemo(() => {
    const labels: string[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      labels.push(`${hour12}:00 ${ampm}`);
    }
    return labels;
  }, [startHour, endHour]);

  const isToday = isSameDay(date, new Date());

  // Calculate current time indicator position
  const currentTimePosition = useMemo(() => {
    if (!isToday) return null;
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (hours < startHour || hours > endHour) return null;
    return ((hours - startHour) * 60 + minutes) * (slotHeight / 60);
  }, [isToday, startHour, endHour, slotHeight]);

  // Filter jobs for current day
  const dayJobs = useMemo(() => {
    return jobs.filter(job => 
      job.scheduled_date && isSameDay(new Date(job.scheduled_date), date)
    );
  }, [jobs, date]);

  return (
    <div className="flex flex-col h-full border rounded-lg bg-background overflow-hidden">
      {/* Date header */}
      <div className="shrink-0 border-b bg-muted/30 px-4 py-3">
        <div className={cn(
          "text-lg font-semibold",
          isToday && "text-primary"
        )}>
          {format(date, 'EEEE, MMMM d, yyyy')}
        </div>
      </div>

      {/* Grid container */}
      <ScrollArea className="flex-1">
        <div className="flex min-w-max">
          {/* Time labels column */}
          <div className="sticky left-0 z-20 bg-background border-r w-20 shrink-0">
            {/* Header spacer */}
            <div className="h-14 border-b bg-muted/30" />
            {/* Time labels */}
            {timeLabels.map((time, index) => (
              <div
                key={index}
                className="flex items-start justify-end pr-3 text-xs text-muted-foreground border-b"
                style={{ height: slotHeight }}
              >
                <span className="-mt-2">{time}</span>
              </div>
            ))}
          </div>

          {/* Technician columns */}
          <div className="flex flex-1">
            {technicians.map((tech) => (
              <TechnicianColumn
                key={tech.id}
                technician={tech}
                date={date}
                jobs={dayJobs.filter(j => j.assigned_technician_id === tech.id)}
                onSlotClick={(time) => onSlotClick(tech.id, time)}
                onJobClick={onJobClick}
                startHour={startHour}
                endHour={endHour}
                slotHeight={slotHeight}
                currentTimePosition={currentTimePosition}
              />
            ))}

            {technicians.length === 0 && (
              <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground">
                No technicians available
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
