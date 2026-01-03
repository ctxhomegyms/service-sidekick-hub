import { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ViewToggle, ScheduleView } from '@/components/schedule/ViewToggle';
import { ScheduleFilters, ScheduleFiltersState } from '@/components/schedule/ScheduleFilters';
import { TimeGrid, useTimeGridConfig } from '@/components/schedule/TimeGrid';
import { DayColumn } from '@/components/schedule/DayColumn';
import { CalendarJobCard } from '@/components/schedule/CalendarJobCard';
import { JobDetailPopover } from '@/components/schedule/JobDetailPopover';
import { cn } from '@/lib/utils';

type JobStatus = 'pending' | 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface ScheduledJob {
  id: string;
  title: string;
  status: JobStatus;
  priority: Priority;
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
  } | null;
}

export default function Schedule() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ScheduleView>('week');
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ScheduleFiltersState>({
    statuses: [],
    priorities: [],
  });
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const { timeSlots, startHour, slotHeight } = useTimeGridConfig();

  // Calculate date ranges based on view
  const { weekStart, weekDays, monthStart, monthEnd, monthDays } = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return { weekStart, weekDays, monthStart, monthEnd, monthDays };
  }, [currentDate]);

  useEffect(() => {
    fetchScheduledJobs();
  }, [currentDate, view]);

  const fetchScheduledJobs = async () => {
    try {
      let startDate: string;
      let endDate: string;

      if (view === 'month') {
        startDate = format(monthStart, 'yyyy-MM-dd');
        endDate = format(monthEnd, 'yyyy-MM-dd');
      } else if (view === 'day') {
        startDate = format(currentDate, 'yyyy-MM-dd');
        endDate = format(currentDate, 'yyyy-MM-dd');
      } else {
        startDate = format(weekStart, 'yyyy-MM-dd');
        endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      }

      const { data } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          status,
          priority,
          scheduled_date,
          scheduled_time,
          estimated_duration_minutes,
          address,
          city,
          state,
          zip_code,
          customer:customers(id, name, email, phone),
          technician:profiles!jobs_assigned_technician_id_fkey(id, full_name, avatar_url)
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

  // Apply filters
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (filters.statuses.length > 0 && !filters.statuses.includes(job.status)) {
        return false;
      }
      if (filters.priorities.length > 0 && !filters.priorities.includes(job.priority)) {
        return false;
      }
      return true;
    });
  }, [jobs, filters]);

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (view === 'month') {
      setCurrentDate((current) => (direction === 'next' ? addMonths(current, 1) : subMonths(current, 1)));
    } else if (view === 'day') {
      setCurrentDate((current) => addDays(current, direction === 'next' ? 1 : -1));
    } else {
      setCurrentDate((current) => (direction === 'next' ? addWeeks(current, 1) : subWeeks(current, 1)));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleViewChange = (newView: ScheduleView) => {
    if (newView === 'map') {
      navigate('/map');
      return;
    }
    setView(newView);
  };

  const getDateRangeLabel = () => {
    if (view === 'month') {
      return format(currentDate, 'MMMM yyyy');
    }
    if (view === 'day') {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    }
    return `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`;
  };

  const getJobsForDay = (date: Date) => {
    return filteredJobs.filter(
      (job) => job.scheduled_date && isSameDay(new Date(job.scheduled_date), date)
    );
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
            <p className="text-muted-foreground">Manage your team's calendar</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => navigatePeriod('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={goToToday} className="min-w-[80px]">
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigatePeriod('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Date range label */}
            <span className="text-lg font-semibold min-w-[200px] text-center hidden md:block">
              {getDateRangeLabel()}
            </span>

            {/* Filters */}
            <ScheduleFilters filters={filters} onChange={setFilters} />

            {/* View toggle */}
            <ViewToggle value={view} onChange={handleViewChange} />
          </div>
        </div>

        {/* Mobile date label */}
        <div className="text-center font-semibold md:hidden">
          {getDateRangeLabel()}
        </div>

        {/* Week View */}
        {view === 'week' && (
          <TimeGrid startHour={startHour} slotHeight={slotHeight}>
            {weekDays.map((day) => (
              <DayColumn
                key={day.toISOString()}
                date={day}
                jobs={filteredJobs}
                timeSlots={timeSlots}
                slotHeight={slotHeight}
                startHour={startHour}
              />
            ))}
          </TimeGrid>
        )}

        {/* Day View */}
        {view === 'day' && (
          <TimeGrid startHour={startHour} slotHeight={slotHeight}>
            <DayColumn
              date={currentDate}
              jobs={filteredJobs}
              timeSlots={timeSlots}
              slotHeight={slotHeight}
              startHour={startHour}
            />
          </TimeGrid>
        )}

        {/* Month View */}
        {view === 'month' && (
          <div className="rounded-lg border bg-background overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-start-${i}`} className="min-h-[100px] border-r border-b bg-muted/20" />
              ))}

              {/* Month days */}
              {monthDays.map((day) => {
                const dayJobs = getJobsForDay(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'min-h-[100px] border-r border-b p-1',
                      isToday && 'bg-primary/5'
                    )}
                  >
                    <div
                      className={cn(
                        'text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                        isToday && 'bg-primary text-primary-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayJobs.slice(0, 3).map((job) => (
                        <JobDetailPopover
                          key={job.id}
                          job={job}
                          open={selectedJobId === job.id}
                          onOpenChange={(open) => setSelectedJobId(open ? job.id : null)}
                        >
                          <div
                            onClick={() => setSelectedJobId(job.id)}
                            className="text-xs p-1 rounded bg-primary/10 truncate cursor-pointer hover:bg-primary/20"
                          >
                            {job.customer?.name || job.title}
                          </div>
                        </JobDetailPopover>
                      ))}
                      {dayJobs.length > 3 && (
                        <div className="text-xs text-muted-foreground pl-1">
                          +{dayJobs.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Empty cells for days after month ends */}
              {Array.from({ length: 6 - monthEnd.getDay() }).map((_, i) => (
                <div key={`empty-end-${i}`} className="min-h-[100px] border-r border-b bg-muted/20" />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
