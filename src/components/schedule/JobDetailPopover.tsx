import { format } from 'date-fns';
import { Mail, Phone, MapPin, Users, ExternalLink, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatusBadge } from '@/components/StatusBadge';
import { Link } from 'react-router-dom';
import { ReactNode } from 'react';

type JobStatus = 'pending' | 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';

interface JobDetailPopoverProps {
  job: {
    id: string;
    title: string;
    status: JobStatus;
    scheduled_date: string | null;
    scheduled_time: string | null;
    estimated_duration_minutes: number | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
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
      email?: string;
    } | null;
  };
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onMessageClick?: () => void;
}

export function JobDetailPopover({ job, children, open, onOpenChange, onMessageClick }: JobDetailPopoverProps) {
  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getEndTime = (startTime: string | null, durationMinutes: number | null) => {
    if (!startTime || !durationMinutes) return null;
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    const ampm = endHours >= 12 ? 'PM' : 'AM';
    const hour12 = endHours % 12 || 12;
    return `${hour12}:${endMins.toString().padStart(2, '0')} ${ampm}`;
  };

  const fullAddress = [job.address, job.city, job.state, job.zip_code]
    .filter(Boolean)
    .join(', ');

  const initials = job.technician?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const hasContact = job.customer?.phone || job.customer?.email;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {job.scheduled_date && (
                <span className="text-sm text-muted-foreground">
                  {format(new Date(job.scheduled_date), 'MMM d, yyyy')}
                </span>
              )}
              {job.scheduled_time && (
                <span className="text-sm text-muted-foreground">
                  {formatTime(job.scheduled_time)}
                  {job.estimated_duration_minutes && ` - ${getEndTime(job.scheduled_time, job.estimated_duration_minutes)}`}
                </span>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              #{job.id.slice(0, 4).toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{job.customer?.name || 'No customer'}</span>
            <StatusBadge status={job.status} className="text-xs py-0" />
          </div>
        </div>

        {/* Contact info */}
        {job.customer && (job.customer.email || job.customer.phone) && (
          <div className="p-4 border-b space-y-2">
            {job.customer.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <a href={`mailto:${job.customer.email}`} className="hover:text-primary">
                  {job.customer.email}
                </a>
              </div>
            )}
            {job.customer.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <a href={`tel:${job.customer.phone}`} className="hover:text-primary">
                  {job.customer.phone}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Location */}
        {fullAddress && (
          <div className="p-4 border-b">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">Location</div>
                <div className="text-muted-foreground">{fullAddress}</div>
              </div>
            </div>
          </div>
        )}

        {/* Crew */}
        {job.technician && (
          <div className="p-4 border-b">
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium text-sm mb-2">Crew</div>
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={job.technician.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{job.technician.full_name}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/jobs?edit=${job.id}`}>
              Edit job
            </Link>
          </Button>
          {hasContact && onMessageClick && (
            <Button variant="ghost" size="sm" onClick={onMessageClick}>
              <MessageSquare className="w-4 h-4 mr-1" />
              Message
            </Button>
          )}
          <Button size="sm" asChild className="ml-auto">
            <Link to={`/jobs?view=${job.id}`}>
              View details
              <ExternalLink className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
