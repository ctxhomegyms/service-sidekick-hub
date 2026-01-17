import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, User, Calendar, Package, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface JobCardProps {
  job: {
    id: string;
    title: string;
    description?: string | null;
    status: 'pending' | 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    scheduled_date?: string | null;
    scheduled_time?: string | null;
    address?: string | null;
    city?: string | null;
    service_category?: string | null;
    customer?: { name: string } | null;
    technician?: { full_name: string | null; avatar_url: string | null } | null;
  };
  onClick?: () => void;
  className?: string;
}

export function JobCard({ job, onClick, className }: JobCardProps) {
  const navigate = useNavigate();
  
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/jobs/${job.id}`);
    }
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md hover:border-accent/50",
        "animate-slide-up",
        className
      )}
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {job.service_category === 'pickup' && (
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200 gap-1">
                  <Package className="w-3 h-3" />
                  Pickup
                </Badge>
              )}
              {job.service_category === 'delivery' && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 gap-1">
                  <Truck className="w-3 h-3" />
                  Delivery
                </Badge>
              )}
            </div>
            <h3 className="font-semibold truncate">{job.title}</h3>
            {job.customer && (
              <p className="text-sm text-muted-foreground truncate">
                {job.customer.name}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <PriorityBadge priority={job.priority} />
            <StatusBadge status={job.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {job.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {job.description}
          </p>
        )}
        
        <div className="space-y-2 text-sm text-muted-foreground">
          {job.scheduled_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>
                {format(new Date(job.scheduled_date), 'MMM d, yyyy')}
                {job.scheduled_time && ` at ${job.scheduled_time.slice(0, 5)}`}
              </span>
            </div>
          )}
          
          {(job.address || job.city) && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {[job.address, job.city].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
        </div>

        {job.technician && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
            <Avatar className="w-6 h-6">
              <AvatarImage src={job.technician.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                {getInitials(job.technician.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {job.technician.full_name || 'Unassigned'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
