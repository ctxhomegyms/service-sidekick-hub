import { Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduledJob } from './TimeGridSchedule';

interface CleanJobBlockProps {
  job: ScheduledJob;
  top: number;
  height: number;
  width: number;
  left: number;
  onClick: () => void;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-card border-l-muted-foreground/60',
  scheduled: 'bg-blue-50 dark:bg-blue-950/40 border-l-blue-500',
  en_route: 'bg-purple-50 dark:bg-purple-950/40 border-l-purple-500',
  in_progress: 'bg-amber-50 dark:bg-amber-950/40 border-l-amber-500',
  completed: 'bg-green-50 dark:bg-green-950/40 border-l-green-500',
  cancelled: 'bg-muted/50 border-l-muted-foreground/40',
};

export function CleanJobBlock({
  job,
  top,
  height,
  width,
  left,
  onClick,
}: CleanJobBlockProps) {
  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const isCompact = height < 55;
  const isVeryCompact = height < 40;

  return (
    <div
      className={cn(
        'job-block absolute rounded-md border-l-[3px] shadow-sm cursor-pointer',
        'transition-shadow hover:shadow-md hover:z-10',
        'border border-transparent hover:border-border/50',
        statusStyles[job.status] || statusStyles.pending
      )}
      style={{
        top: top + 1,
        height: height - 2,
        left: `calc(${left}% + 1px)`,
        width: `calc(${width}% - 2px)`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div className={cn(
        "h-full flex flex-col overflow-hidden",
        isCompact ? "px-1.5 py-1" : "px-2 py-1.5"
      )}>
        {/* Title - always show */}
        <div className={cn(
          "font-medium truncate leading-tight",
          isCompact ? "text-xs" : "text-sm"
        )}>
          {job.title}
        </div>

        {/* Time + Duration */}
        {!isVeryCompact && job.scheduled_time && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
            <span>{formatTime(job.scheduled_time)}</span>
            {job.estimated_duration_minutes && (
              <>
                <span className="opacity-50">·</span>
                <span>{job.estimated_duration_minutes}m</span>
              </>
            )}
          </div>
        )}

        {/* Customer */}
        {!isCompact && job.customer && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-auto truncate">
            <User className="w-3 h-3 shrink-0 opacity-60" />
            <span className="truncate">{job.customer.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
