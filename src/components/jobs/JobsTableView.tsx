import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin, Clock, User } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

interface JobsTableViewProps {
  jobs: Job[];
}

const priorityConfig = {
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', className: 'bg-info/20 text-info-foreground' },
  high: { label: 'High', className: 'bg-warning/20 text-warning-foreground' },
  urgent: { label: 'Urgent', className: 'bg-destructive/20 text-destructive' },
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

export function JobsTableView({ jobs }: JobsTableViewProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Technician</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow
              key={job.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/jobs/${job.id}`)}
            >
              <TableCell className="font-medium max-w-[200px]">
                <div className="truncate">{job.title}</div>
                {job.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {job.description}
                  </div>
                )}
              </TableCell>

              <TableCell>
                {job.customer?.name || (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>

              <TableCell>
                <StatusBadge status={job.status} />
              </TableCell>

              <TableCell>
                <Badge variant="outline" className={priorityConfig[job.priority].className}>
                  {priorityConfig[job.priority].label}
                </Badge>
              </TableCell>

              <TableCell>
                {job.scheduled_date ? (
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>
                      {format(new Date(job.scheduled_date), 'MMM d')}
                      {job.scheduled_time && `, ${job.scheduled_time.slice(0, 5)}`}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Not scheduled</span>
                )}
              </TableCell>

              <TableCell>
                {job.address || job.city ? (
                  <div className="flex items-center gap-1 text-sm max-w-[150px]">
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {job.city || job.address}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>

              <TableCell>
                {job.technician ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={job.technician.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(job.technician.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate max-w-[100px]">
                      {job.technician.full_name || 'Unknown'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="text-sm">Unassigned</span>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
