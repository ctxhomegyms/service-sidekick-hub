import { Clock, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduledJob } from './TimeGridSchedule';

interface ScheduledJobBlockProps {
  job: ScheduledJob;
  top: number;
  height: number;
  width: number;
  left: number;
  onClick: () => void;
}

const statusColors: Record<string, string> = {
  pending: 'border-l-muted-foreground bg-muted/50',
  scheduled: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/30',
  en_route: 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/30',
  in_progress: 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/30',
  completed: 'border-l-green-500 bg-green-50 dark:bg-green-950/30',
  cancelled: 'border-l-destructive bg-destructive/10',
};

export function ScheduledJobBlock({
  job,
  top,
  height,
  width,
  left,
  onClick,
}: ScheduledJobBlockProps) {
  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const isCompact = height < 60;
  const isVeryCompact = height < 45;

  return (
    <div
      className={cn(
        'job-block absolute rounded-md border-l-4 shadow-sm cursor-pointer transition-all',
        'hover:shadow-md hover:z-20 hover:scale-[1.02]',
        statusColors[job.status] || statusColors.pending
      )}
      style={{
        top: top,
        height: height - 2,
        left: `calc(${left}% + 2px)`,
        width: `calc(${width}% - 4px)`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div className={cn("p-2 h-full flex flex-col overflow-hidden", isCompact && "p-1.5")}>
        {/* Time */}
        {!isVeryCompact && job.scheduled_time && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
            <Clock className="w-3 h-3" />
            {formatTime(job.scheduled_time)}
            {job.estimated_duration_minutes && (
              <span className="opacity-70">
                ({job.estimated_duration_minutes}m)
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <div className={cn(
          "font-medium truncate",
          isCompact ? "text-xs" : "text-sm"
        )}>
          {job.title}
        </div>

        {/* Customer */}
        {!isCompact && job.customer && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate mt-0.5">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{job.customer.name}</span>
          </div>
        )}

        {/* Location */}
        {!isCompact && job.city && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{job.city}</span>
          </div>
        )}
      </div>
    </div>
  );
}
