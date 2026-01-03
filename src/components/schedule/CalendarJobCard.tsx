import { Check, Clock, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type JobStatus = 'pending' | 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';

interface CalendarJobCardProps {
  job: {
    id: string;
    title: string;
    status: JobStatus;
    scheduled_time: string | null;
    estimated_duration_minutes: number | null;
    address: string | null;
    customer: { name: string } | null;
    technician: { full_name: string | null; avatar_url?: string | null } | null;
  };
  onClick: () => void;
  compact?: boolean;
}

const statusBorderColors: Record<JobStatus, string> = {
  pending: 'border-l-muted-foreground',
  scheduled: 'border-l-blue-500',
  en_route: 'border-l-purple-500',
  in_progress: 'border-l-amber-500',
  completed: 'border-l-green-500',
  cancelled: 'border-l-destructive',
};

export function CalendarJobCard({ job, onClick, compact = false }: CalendarJobCardProps) {
  const isCompleted = job.status === 'completed';
  const initials = job.technician?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getEndTime = (startTime: string | null, durationMinutes: number | null) => {
    if (!startTime || !durationMinutes) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    const ampm = endHours >= 12 ? 'PM' : 'AM';
    const hour12 = endHours % 12 || 12;
    return `${hour12}:${endMins.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative group cursor-pointer rounded-md border-l-4 bg-card p-2 shadow-sm hover:shadow-md transition-all',
        statusBorderColors[job.status],
        compact ? 'text-xs' : 'text-sm'
      )}
    >
      {isCompleted && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Customer name */}
      <div className="font-medium text-primary truncate">
        {job.customer?.name || 'No customer'}
      </div>

      {/* Address */}
      {job.address && !compact && (
        <div className="flex items-center gap-1 text-muted-foreground mt-0.5 truncate">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{job.address}</span>
        </div>
      )}

      {/* Time range */}
      {job.scheduled_time && (
        <div className="flex items-center gap-1 text-muted-foreground mt-1">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>
            {formatTime(job.scheduled_time)}
            {job.estimated_duration_minutes && ` - ${getEndTime(job.scheduled_time, job.estimated_duration_minutes)}`}
          </span>
        </div>
      )}

      {/* Technician avatar */}
      {job.technician && !compact && (
        <div className="flex items-center gap-1.5 mt-2">
          <Avatar className="w-5 h-5">
            <AvatarImage src={job.technician.avatar_url || undefined} />
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">
            {job.technician.full_name}
          </span>
        </div>
      )}
    </div>
  );
}
