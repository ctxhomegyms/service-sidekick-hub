import { useMemo, useState, useRef } from 'react';
import { format, isSameDay } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CleanJobBlock } from './CleanJobBlock';
import { QuickAssignPopover } from './QuickAssignPopover';
import { cn } from '@/lib/utils';
import type { ScheduledJob, Technician } from './TimeGridSchedule';

interface CleanTimeGridProps {
  date: Date;
  technicians: Technician[];
  jobs: ScheduledJob[];
  onJobClick: (job: ScheduledJob) => void;
  onScheduled: () => void;
  isManager?: boolean;
  startHour?: number;
  endHour?: number;
}

const SLOT_HEIGHT = 64;

export function CleanTimeGrid({
  date,
  technicians,
  jobs,
  onJobClick,
  onScheduled,
  isManager = false,
  startHour = 6,
  endHour = 20,
}: CleanTimeGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<{
    open: boolean;
    techId: string;
    techName: string | null;
    time: string;
  } | null>(null);

  const totalHours = endHour - startHour;

  // Generate hour labels
  const hours = useMemo(() => {
    return Array.from({ length: totalHours }, (_, i) => {
      const hour = startHour + i;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour} ${ampm}`;
    });
  }, [startHour, totalHours]);

  // Current time indicator position
  const currentTimePosition = useMemo(() => {
    const now = new Date();
    if (!isSameDay(date, now)) return null;
    
    const currentHours = now.getHours();
    const minutes = now.getMinutes();
    
    if (currentHours < startHour || currentHours >= endHour) return null;
    
    const minutesSinceStart = (currentHours - startHour) * 60 + minutes;
    return (minutesSinceStart / 60) * SLOT_HEIGHT;
  }, [date, startHour, endHour]);

  // Filter jobs for this date
  const dayJobs = useMemo(() => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return jobs.filter(job => job.scheduled_date === dateStr);
  }, [jobs, date]);

  // Get jobs for a specific technician with positioning
  const getJobsForTech = (techId: string) => {
    const techJobs = dayJobs.filter(job => job.assigned_technician_id === techId);
    
    return techJobs.map(job => {
      if (!job.scheduled_time) return { job, top: 0, height: SLOT_HEIGHT };
      
      const [jobHours, jobMinutes] = job.scheduled_time.split(':').map(Number);
      const startMinutes = (jobHours - startHour) * 60 + jobMinutes;
      const duration = job.estimated_duration_minutes || 60;
      
      const top = (startMinutes / 60) * SLOT_HEIGHT;
      const height = Math.max((duration / 60) * SLOT_HEIGHT, 40);
      
      return { job, top, height };
    }).sort((a, b) => a.top - b.top);
  };

  // Handle click on grid to schedule
  const handleGridClick = (e: React.MouseEvent, techId: string, techName: string | null) => {
    if (!isManager) return;
    if ((e.target as HTMLElement).closest('.job-block')) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // Calculate time from click position
    const totalMinutes = (y / SLOT_HEIGHT) * 60;
    const clickHours = Math.floor(totalMinutes / 60) + startHour;
    const clickMinutes = Math.round((totalMinutes % 60) / 15) * 15;
    
    if (clickHours >= startHour && clickHours < endHour) {
      const timeStr = `${clickHours.toString().padStart(2, '0')}:${clickMinutes.toString().padStart(2, '0')}`;
      setPopover({ open: true, techId, techName, time: timeStr });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'T';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (technicians.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No technicians available
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background border rounded-lg overflow-hidden">
      {/* Fixed header row */}
      <div className="flex border-b shrink-0">
        {/* Time column header */}
        <div className="w-16 shrink-0 border-r bg-muted/30" />
        
        {/* Technician headers */}
        {technicians.map(tech => (
          <div
            key={tech.id}
            className="flex-1 min-w-[180px] p-2 border-r last:border-r-0 bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7">
                <AvatarImage src={tech.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(tech.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">
                  {tech.full_name || 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getJobsForTech(tech.id).length} jobs
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-auto" ref={gridRef}>
        <div className="flex min-h-full">
          {/* Time labels column */}
          <div className="w-16 shrink-0 border-r bg-muted/20 sticky left-0 z-10">
            {hours.map((label, i) => (
              <div
                key={i}
                className="relative border-b border-border/30"
                style={{ height: SLOT_HEIGHT }}
              >
                <span className="absolute -top-2.5 right-2 text-xs text-muted-foreground font-medium">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Technician columns */}
          {technicians.map((tech, techIndex) => {
            const techJobs = getJobsForTech(tech.id);
            
            return (
              <div
                key={tech.id}
                className={cn(
                  "flex-1 min-w-[180px] relative border-r last:border-r-0",
                  isManager && "cursor-pointer hover:bg-muted/5"
                )}
                style={{ height: totalHours * SLOT_HEIGHT }}
                onClick={(e) => handleGridClick(e, tech.id, tech.full_name)}
              >
                {/* Hour grid lines */}
                {hours.map((_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-b border-border/30"
                    style={{ top: (i + 1) * SLOT_HEIGHT }}
                  />
                ))}

                {/* Half-hour lines (subtle) */}
                {hours.map((_, i) => (
                  <div
                    key={`half-${i}`}
                    className="absolute left-0 right-0 border-b border-border/15"
                    style={{ top: i * SLOT_HEIGHT + SLOT_HEIGHT / 2 }}
                  />
                ))}

                {/* Current time indicator */}
                {currentTimePosition !== null && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                    style={{ top: currentTimePosition }}
                  >
                    {techIndex === 0 && (
                      <div className="w-2 h-2 rounded-full bg-destructive -ml-1" />
                    )}
                    <div className="flex-1 h-0.5 bg-destructive" />
                  </div>
                )}

                {/* Job blocks */}
                <div className="absolute inset-0 p-0.5">
                  {techJobs.map(({ job, top, height }) => (
                    <CleanJobBlock
                      key={job.id}
                      job={job}
                      top={top}
                      height={height}
                      width={100}
                      left={0}
                      onClick={() => onJobClick(job)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick assign popover */}
      {popover && (
        <QuickAssignPopover
          open={popover.open}
          onOpenChange={(open) => !open && setPopover(null)}
          technicianId={popover.techId}
          technicianName={popover.techName}
          date={date}
          time={popover.time}
          onScheduled={() => {
            setPopover(null);
            onScheduled();
          }}
        />
      )}
    </div>
  );
}
