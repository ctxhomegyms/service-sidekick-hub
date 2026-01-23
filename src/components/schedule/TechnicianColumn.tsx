import { useCallback, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScheduledJobBlock } from './ScheduledJobBlock';
import { cn } from '@/lib/utils';
import type { ScheduledJob, Technician } from './TimeGridSchedule';

interface TechnicianColumnProps {
  technician: Technician;
  date: Date;
  jobs: ScheduledJob[];
  onSlotClick: (time: string) => void;
  onJobClick: (job: ScheduledJob) => void;
  startHour: number;
  endHour: number;
  slotHeight: number;
  currentTimePosition: number | null;
}

export function TechnicianColumn({
  technician,
  date,
  jobs,
  onSlotClick,
  onJobClick,
  startHour,
  endHour,
  slotHeight,
  currentTimePosition,
}: TechnicianColumnProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const totalHours = endHour - startHour;

  const getInitials = (name: string | null) => {
    if (!name) return 'T';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!gridRef.current) return;
    
    // Check if click was on a job block
    if ((e.target as HTMLElement).closest('.job-block')) return;

    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // Calculate time from click position
    const totalMinutes = (y / slotHeight) * 60;
    const hours = Math.floor(totalMinutes / 60) + startHour;
    const minutes = Math.round((totalMinutes % 60) / 15) * 15; // Snap to 15 min
    
    if (hours >= startHour && hours < endHour) {
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      onSlotClick(timeStr);
    }
  }, [slotHeight, startHour, endHour, onSlotClick]);

  // Calculate job positions
  const positionedJobs = useMemo(() => {
    return jobs.map(job => {
      if (!job.scheduled_time) {
        return { job, top: 0, height: slotHeight };
      }

      const [hours, minutes] = job.scheduled_time.split(':').map(Number);
      const startMinutes = (hours - startHour) * 60 + minutes;
      const duration = job.estimated_duration_minutes || 60;

      const top = (startMinutes / 60) * slotHeight;
      const height = Math.max((duration / 60) * slotHeight, 40); // Min height 40px

      return { job, top, height };
    });
  }, [jobs, startHour, slotHeight]);

  // Detect overlapping jobs and assign columns
  const layoutJobs = useMemo(() => {
    const sorted = [...positionedJobs].sort((a, b) => a.top - b.top);
    const columns: { endTime: number }[] = [];
    
    return sorted.map(item => {
      const endTime = item.top + item.height;
      
      // Find first available column
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

      return { ...item, width, left, totalColumns };
    });
  }, [positionedJobs]);

  return (
    <div className="flex-1 min-w-[200px] border-r last:border-r-0">
      {/* Technician header */}
      <div className="sticky top-0 z-10 h-14 border-b bg-muted/30 p-2 flex items-center gap-2">
        <Avatar className="w-8 h-8">
          <AvatarImage src={technician.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(technician.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">
            {technician.full_name || 'Unknown'}
          </p>
          <p className="text-xs text-muted-foreground">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Time grid */}
      <div
        ref={gridRef}
        className="relative cursor-pointer hover:bg-muted/10 transition-colors"
        onClick={handleGridClick}
        style={{ height: totalHours * slotHeight }}
      >
        {/* Hour grid lines */}
        {Array.from({ length: totalHours }).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-b border-dashed border-muted"
            style={{ top: i * slotHeight + slotHeight }}
          />
        ))}

        {/* Half-hour grid lines (subtle) */}
        {Array.from({ length: totalHours }).map((_, i) => (
          <div
            key={`half-${i}`}
            className="absolute left-0 right-0 border-b border-dotted border-muted/50"
            style={{ top: i * slotHeight + slotHeight / 2 }}
          />
        ))}

        {/* Current time indicator */}
        {currentTimePosition !== null && (
          <div
            className="absolute left-0 right-0 z-30 pointer-events-none"
            style={{ top: currentTimePosition }}
          >
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <div className="flex-1 h-[2px] bg-destructive" />
            </div>
          </div>
        )}

        {/* Job blocks */}
        <div className="absolute inset-0 p-1">
          {layoutJobs.map(({ job, top, height, width, left }) => (
            <ScheduledJobBlock
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
}
