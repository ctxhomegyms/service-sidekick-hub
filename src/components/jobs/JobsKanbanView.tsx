import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Job {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduled_date: string | null;
  scheduled_time: string | null;
  address: string | null;
  city: string | null;
  customer: { name: string } | null;
  technician: { full_name: string | null; avatar_url: string | null } | null;
}

interface JobsKanbanViewProps {
  jobs: Job[];
}

const columns = [
  { id: 'pending', label: 'Pending', color: 'bg-warning' },
  { id: 'scheduled', label: 'Scheduled', color: 'bg-info' },
  { id: 'en_route', label: 'En Route', color: 'bg-info' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-accent' },
  { id: 'completed', label: 'Completed', color: 'bg-success' },
] as const;

const priorityConfig = {
  low: 'border-l-muted-foreground',
  medium: 'border-l-info',
  high: 'border-l-warning',
  urgent: 'border-l-destructive',
};

function getInitials(name: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function JobsKanbanView({ jobs }: JobsKanbanViewProps) {
  const navigate = useNavigate();

  const getJobsByStatus = (status: string) =>
    jobs.filter((job) => job.status === status);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnJobs = getJobsByStatus(column.id);
        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-72 bg-muted/30 rounded-lg"
          >
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${column.color}`} />
                <h3 className="font-medium text-sm">{column.label}</h3>
              </div>
              <Badge variant="secondary" className="text-xs">
                {columnJobs.length}
              </Badge>
            </div>

            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="p-2 space-y-2">
                {columnJobs.map((job) => (
                  <Card
                    key={job.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${priorityConfig[job.priority]}`}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm font-medium line-clamp-2">
                        {job.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      {job.customer && (
                        <p className="text-xs text-muted-foreground">
                          {job.customer.name}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        {job.scheduled_date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(new Date(job.scheduled_date), 'MMM d')}
                            </span>
                          </div>
                        )}

                        {job.technician && (
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={job.technician.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(job.technician.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>

                      {(job.city || job.address) && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{job.city || job.address}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {columnJobs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No jobs
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
