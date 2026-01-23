import { useMemo, useState, useRef, useCallback } from 'react';
import { isSameDay } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface HoverSlot {
  technicianId: string;
  technicianName: string | null;
  time: string;
  top: number;
  columnIndex: number;
}

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
  const slotHeight = 64; // pixels per hour
  const totalHours = endHour - startHour;
  const columnWidth = 220; // min column width
  
  const [hoverSlot, setHoverSlot] = useState<HoverSlot | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<HoverSlot | null>(null);
  const gridRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const timeLabels = useMemo(() => {
    const labels: string[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      labels.push(`${hour12} ${ampm}`);
    }
    return labels;
  }, [startHour, endHour]);

  const isToday = isSameDay(date, new Date());

  // Current time indicator position
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

  const getInitials = (name: string | null) => {
    if (!name) return 'T';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleMouseMove = useCallback((
    e: React.MouseEvent<HTMLDivElement>,
    techId: string,
    techName: string | null,
    columnIndex: number
  ) => {
    if (!isManager) return;
    
    const gridEl = gridRefs.current.get(techId);
    if (!gridEl) return;

    const rect = gridEl.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // Calculate time from position (snap to 15 min)
    const totalMinutes = (y / slotHeight) * 60;
    const hours = Math.floor(totalMinutes / 60) + startHour;
    const minutes = Math.floor((totalMinutes % 60) / 15) * 15;
    
    if (hours >= startHour && hours < endHour) {
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      const slotTop = ((hours - startHour) * 60 + minutes) * (slotHeight / 60);
      
      setHoverSlot({
        technicianId: techId,
        technicianName: techName,
        time: timeStr,
        top: slotTop,
        columnIndex,
      });
    }
  }, [isManager, slotHeight, startHour, endHour]);

  const handleMouseLeave = useCallback(() => {
    if (!popoverOpen) {
      setHoverSlot(null);
    }
  }, [popoverOpen]);

  const handleSlotClick = useCallback((e: React.MouseEvent) => {
    if (!hoverSlot || !isManager) return;
    
    // Don't trigger if clicking on a job block
    if ((e.target as HTMLElement).closest('.job-block')) return;
    
    setSelectedSlot(hoverSlot);
    setPopoverOpen(true);
  }, [hoverSlot, isManager]);

  const handlePopoverClose = useCallback((open: boolean) => {
    setPopoverOpen(open);
    if (!open) {
      setSelectedSlot(null);
      setHoverSlot(null);
    }
  }, []);

  const formatTimePreview = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  // Calculate job positions for a technician
  const getJobsForTech = (techId: string) => {
    const techJobs = dayJobs.filter(j => j.assigned_technician_id === techId);
    
    // Calculate positions
    const positioned = techJobs.map(job => {
      if (!job.scheduled_time) {
        return { job, top: 0, height: slotHeight };
      }

      const [hours, minutes] = job.scheduled_time.split(':').map(Number);
      const startMinutes = (hours - startHour) * 60 + minutes;
      const duration = job.estimated_duration_minutes || 60;

      const top = (startMinutes / 60) * slotHeight;
      const height = Math.max((duration / 60) * slotHeight, 44);

      return { job, top, height };
    });

    // Handle overlaps
    const sorted = [...positioned].sort((a, b) => a.top - b.top);
    const columns: { endTime: number }[] = [];
    
    return sorted.map(item => {
      const endTime = item.top + item.height;
      
      let columnIndex = columns.findIndex(col => col.endTime <= item.top);
      if (columnIndex === -1) {
        columnIndex = columns.length;
        columns.push({ endTime });
      } else {
        columns[columnIndex].endTime = endTime;
      }

      const totalColumns = Math.max(columns.length, 1);
      const width = 100 / totalColumns;
      const left = columnIndex * width;

      return { ...item, width, left };
    });
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border overflow-hidden">
      {/* Grid container */}
      <ScrollArea className="flex-1">
        <div className="flex min-w-max">
          {/* Time labels column */}
          <div className="sticky left-0 z-20 bg-background w-16 shrink-0 border-r">
            {/* Header spacer */}
            <div className="h-12 border-b" />
            {/* Time labels */}
            {timeLabels.map((time, index) => (
              <div
                key={index}
                className="flex items-start justify-end pr-2 text-xs text-muted-foreground font-medium"
                style={{ height: slotHeight }}
              >
                <span className="-mt-2">{time}</span>
              </div>
            ))}
          </div>

          {/* Technician columns */}
          <div className="flex flex-1">
            {technicians.map((tech, columnIndex) => {
              const techJobs = getJobsForTech(tech.id);
              const jobCount = techJobs.length;

              return (
                <div
                  key={tech.id}
                  className="flex-1 border-r last:border-r-0"
                  style={{ minWidth: columnWidth }}
                >
                  {/* Technician header */}
                  <div className="sticky top-0 z-10 h-12 border-b bg-card px-3 flex items-center gap-2.5">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={tech.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                        {getInitials(tech.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate leading-tight">
                        {tech.full_name || 'Unknown'}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {jobCount} job{jobCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Time grid area */}
                  <div
                    ref={(el) => {
                      if (el) gridRefs.current.set(tech.id, el);
                    }}
                    className={cn(
                      "relative",
                      isManager && "cursor-pointer"
                    )}
                    style={{ height: totalHours * slotHeight }}
                    onMouseMove={(e) => handleMouseMove(e, tech.id, tech.full_name, columnIndex)}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleSlotClick}
                  >
                    {/* Hour lines */}
                    {Array.from({ length: totalHours + 1 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute left-0 right-0 border-b border-border/50"
                        style={{ top: i * slotHeight }}
                      />
                    ))}

                    {/* Current time indicator */}
                    {currentTimePosition !== null && (
                      <div
                        className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                        style={{ top: currentTimePosition }}
                      >
                        <div className="w-2 h-2 rounded-full bg-destructive -ml-1" />
                        <div className="flex-1 h-[2px] bg-destructive" />
                      </div>
                    )}

                    {/* Hover slot indicator */}
                    {isManager && hoverSlot?.technicianId === tech.id && !popoverOpen && (
                      <div
                        className="absolute left-1 right-1 rounded-md bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center transition-all duration-75 pointer-events-none"
                        style={{
                          top: hoverSlot.top,
                          height: slotHeight / 2,
                        }}
                      >
                        <span className="text-xs font-medium text-primary/70">
                          {formatTimePreview(hoverSlot.time)}
                        </span>
                      </div>
                    )}

                    {/* Job blocks */}
                    <div className="absolute inset-x-1 top-0 bottom-0">
                      {techJobs.map(({ job, top, height, width, left }) => (
                        <CleanJobBlock
                          key={job.id}
                          job={job}
                          top={top}
                          height={height}
                          width={width}
                          left={left}
                          onClick={() => onJobClick(job)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {technicians.length === 0 && (
              <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground">
                No technicians available
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Quick Assign Popover */}
      {selectedSlot && (
        <QuickAssignPopover
          open={popoverOpen}
          onOpenChange={handlePopoverClose}
          technicianId={selectedSlot.technicianId}
          technicianName={selectedSlot.technicianName}
          date={date}
          time={selectedSlot.time}
          onScheduled={onScheduled}
        />
      )}
    </div>
  );
}
