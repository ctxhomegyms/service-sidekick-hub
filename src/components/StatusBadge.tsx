import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type JobStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-status-pending text-warning-foreground' },
  scheduled: { label: 'Scheduled', className: 'bg-status-scheduled text-info-foreground' },
  in_progress: { label: 'In Progress', className: 'bg-status-in-progress text-accent-foreground' },
  completed: { label: 'Completed', className: 'bg-status-completed text-success-foreground' },
  cancelled: { label: 'Cancelled', className: 'bg-status-cancelled text-muted-foreground' },
};

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-priority-low text-success-foreground' },
  medium: { label: 'Medium', className: 'bg-priority-medium text-info-foreground' },
  high: { label: 'High', className: 'bg-priority-high text-warning-foreground' },
  urgent: { label: 'Urgent', className: 'bg-priority-urgent text-destructive-foreground' },
};

interface StatusBadgeProps {
  status: JobStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge className={cn(config.className, 'font-medium', className)}>
      {config.label}
    </Badge>
  );
}

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  return (
    <Badge variant="outline" className={cn(config.className, 'font-medium border-0', className)}>
      {config.label}
    </Badge>
  );
}
