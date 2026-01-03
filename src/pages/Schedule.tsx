import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';

interface ScheduledJob {
  id: string;
  title: string;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduled_date: string;
  scheduled_time: string | null;
  customer: { name: string } | null;
  technician: { full_name: string | null } | null;
}

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetchScheduledJobs();
  }, [currentDate]);

  const fetchScheduledJobs = async () => {
    try {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');

      const { data } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          status,
          priority,
          scheduled_date,
          scheduled_time,
          customer:customers(name),
          technician:profiles!jobs_assigned_technician_id_fkey(full_name)
        `)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .neq('status', 'cancelled')
        .order('scheduled_time');

      setJobs(data as unknown as ScheduledJob[] || []);
    } catch (error) {
      console.error('Error fetching scheduled jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getJobsForDay = (date: Date) => {
    return jobs.filter(job => 
      job.scheduled_date && isSameDay(new Date(job.scheduled_date), date)
    );
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(current => addDays(current, direction === 'next' ? 7 : -7));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
            <p className="text-muted-foreground">Weekly view of scheduled jobs</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={goToToday} className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateWeek('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Week Header */}
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            {format(weekStart, 'MMMM d')} - {format(addDays(weekStart, 6), 'MMMM d, yyyy')}
          </h2>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const dayJobs = getJobsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <Card 
                key={day.toISOString()} 
                className={cn(
                  "min-h-[300px]",
                  isToday && "ring-2 ring-accent"
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className={cn(
                    "text-center text-sm",
                    isToday && "text-accent"
                  )}>
                    <div className="font-medium">{format(day, 'EEE')}</div>
                    <div className={cn(
                      "text-2xl",
                      isToday && "text-accent font-bold"
                    )}>
                      {format(day, 'd')}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-2">
                  {dayJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer text-xs"
                    >
                      <div className="font-medium truncate">{job.title}</div>
                      {job.scheduled_time && (
                        <div className="text-muted-foreground">
                          {job.scheduled_time.slice(0, 5)}
                        </div>
                      )}
                      {job.customer && (
                        <div className="text-muted-foreground truncate">
                          {job.customer.name}
                        </div>
                      )}
                      <div className="mt-1">
                        <StatusBadge status={job.status} className="text-xs py-0 px-1" />
                      </div>
                    </div>
                  ))}
                  {dayJobs.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No jobs
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
