import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, User, Truck, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface ScheduledJob {
  id: string;
  title: string;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduled_time: string | null;
  end_time: string | null;
  address: string | null;
  city: string | null;
  customer: { name: string } | null;
  technician: { full_name: string | null; avatar_url: string | null } | null;
  job_type: { name: string; color: string } | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const priorityIndicator: Record<string, string> = {
  low: 'bg-slate-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

export function TodaysScheduleWidget() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTodaysJobs();
  }, []);

  const fetchTodaysJobs = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          status,
          priority,
          scheduled_time,
          end_time,
          address,
          city,
          customer:customers(name),
          technician:profiles!jobs_assigned_technician_id_fkey(full_name, avatar_url),
          job_type:job_types(name, color)
        `)
        .eq('scheduled_date', today)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      setJobs((data as unknown as ScheduledJob[]) || []);
    } catch (error) {
      console.error('Error fetching today\'s jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Today's Deliveries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Today's Deliveries
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">
              <Calendar className="w-3 h-3 mr-1" />
              {format(new Date(), 'MMM d, yyyy')}
            </Badge>
            <Badge variant="secondary">
              {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No deliveries scheduled for today</p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link to="/schedule">View Schedule</Link>
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {jobs.map((job, index) => (
                <Link 
                  key={job.id} 
                  to={`/jobs/${job.id}`}
                  className="block"
                >
                  <div className="group relative flex gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    {/* Priority indicator */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${priorityIndicator[job.priority]}`} />
                    
                    {/* Time column */}
                    <div className="flex flex-col items-center justify-center min-w-[70px] pl-2">
                      <span className="text-sm font-semibold">{formatTime(job.scheduled_time)}</span>
                      {job.end_time && (
                        <>
                          <span className="text-xs text-muted-foreground">to</span>
                          <span className="text-xs text-muted-foreground">{formatTime(job.end_time)}</span>
                        </>
                      )}
                    </div>

                    {/* Job details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                            {job.title}
                          </h4>
                          {job.customer && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3" />
                              {job.customer.name}
                            </p>
                          )}
                          {(job.address || job.city) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {[job.address, job.city].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={`${statusColors[job.status]} text-xs flex-shrink-0`}
                        >
                          {job.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      {/* Footer with job type and technician */}
                      <div className="flex items-center justify-between mt-2">
                        {job.job_type && (
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{ 
                              borderColor: job.job_type.color,
                              color: job.job_type.color 
                            }}
                          >
                            {job.job_type.name}
                          </Badge>
                        )}
                        {job.technician && (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={job.technician.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(job.technician.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {job.technician.full_name?.split(' ')[0]}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}

        {jobs.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/schedule">
                <Calendar className="w-4 h-4 mr-2" />
                View Full Schedule
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
