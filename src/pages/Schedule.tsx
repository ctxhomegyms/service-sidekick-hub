import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, addWeeks, subWeeks, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Search, Clock, MapPin, PanelLeftClose, PanelLeft, Smartphone, Monitor, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ViewToggle, ScheduleView } from '@/components/schedule/ViewToggle';
import { ScheduleFilters, ScheduleFiltersState } from '@/components/schedule/ScheduleFilters';
import { JobDetailPopover } from '@/components/schedule/JobDetailPopover';
import { ScheduleNotificationDialog } from '@/components/schedule/ScheduleNotificationDialog';
import { QuickMessageDialog } from '@/components/schedule/QuickMessageDialog';
import { TimeGridSchedule, ScheduledJob, Technician } from '@/components/schedule/TimeGridSchedule';
import { QuickScheduleDialog } from '@/components/schedule/QuickScheduleDialog';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { RouteOptimizer } from '@/components/dispatch/RouteOptimizer';
import { notifyJobScheduled } from '@/lib/notifications';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile, useForceMobileLayout } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type JobStatus = 'pending' | 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

export default function Schedule() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [forceMobile, setForceMobile] = useForceMobileLayout();
  const { isManager } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ScheduleView>('day');
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ScheduleFiltersState>({
    statuses: [],
    priorities: [],
  });
  const [selectedJob, setSelectedJob] = useState<ScheduledJob | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnassignedPanel, setShowUnassignedPanel] = useState(true);
  const [mobileTab, setMobileTab] = useState<'unassigned' | 'schedule'>('schedule');
  
  // Quick schedule dialog state
  const [quickScheduleState, setQuickScheduleState] = useState<{
    open: boolean;
    technicianId: string;
    technicianName: string | null;
    time: string;
  }>({
    open: false,
    technicianId: '',
    technicianName: null,
    time: '09:00',
  });
  
  // Notification dialog state
  const [notificationDialog, setNotificationDialog] = useState<{
    open: boolean;
    jobId: string | null;
    customerName: string | null;
    scheduledDate: string | null;
    scheduledTime: string | null;
  }>({
    open: false,
    jobId: null,
    customerName: null,
    scheduledDate: null,
    scheduledTime: null,
  });

  // Quick message dialog state
  const [messageDialog, setMessageDialog] = useState<{
    open: boolean;
    customerName: string | null;
    customerPhone: string | null;
    customerEmail: string | null;
    customerId: string | null;
    jobId: string | null;
  }>({
    open: false,
    customerName: null,
    customerPhone: null,
    customerEmail: null,
    customerId: null,
    jobId: null,
  });

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
    fetchData();
  }, [currentDate, view]);

  const fetchData = async () => {
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

      // Fetch technicians
      const techRolesRes = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'technician');

      const techIds = techRolesRes.data?.map(r => r.user_id) || [];

      const [techRes, jobsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', techIds),
        supabase
          .from('jobs')
          .select(`
            id, title, description, status, priority, 
            scheduled_date, scheduled_time, address, city, state, zip_code,
            assigned_technician_id, estimated_duration_minutes,
            latitude, longitude,
            customer:customers(id, name, email, phone),
            technician:profiles!jobs_assigned_technician_id_fkey(id, full_name, avatar_url)
          `)
          .not('status', 'in', '("completed","cancelled")'),
      ]);

      setTechnicians(techRes.data || []);
      setJobs(jobsRes.data as unknown as ScheduledJob[] || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load schedule data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationConfirm = () => {
    if (notificationDialog.jobId) {
      notifyJobScheduled(notificationDialog.jobId);
      toast.success('Notification sent');
    }
  };

  const handleOpenMessageDialog = (job: ScheduledJob) => {
    setMessageDialog({
      open: true,
      customerName: job.customer?.name || null,
      customerPhone: job.customer?.phone || null,
      customerEmail: job.customer?.email || null,
      customerId: job.customer?.id || null,
      jobId: job.id,
    });
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

  // Unassigned jobs
  const unassignedJobs = useMemo(() => {
    return filteredJobs.filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.customer?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isUnassigned = !job.assigned_technician_id || !job.scheduled_date;
      return matchesSearch && isUnassigned;
    });
  }, [filteredJobs, searchQuery]);

  const getJobsForDay = (date: Date) => {
    return filteredJobs.filter(
      (job) => job.scheduled_date && isSameDay(new Date(job.scheduled_date), date)
    );
  };

  const getJobsForTechOnDay = (techId: string, date: Date) => {
    return filteredJobs.filter(job => 
      job.assigned_technician_id === techId &&
      job.scheduled_date &&
      isSameDay(parseISO(job.scheduled_date), date)
    );
  };

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

  const getInitials = (name: string | null) => {
    if (!name) return 'T';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleRouteOptimize = async (technicianId: string, optimizedJobIds: string[]) => {
    try {
      const updates = optimizedJobIds.map((jobId, index) => {
        const hours = Math.floor((index * 60) / 60) + 8;
        const minutes = (index * 60) % 60;
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
        
        return supabase
          .from('jobs')
          .update({ scheduled_time: timeStr })
          .eq('id', jobId);
      });

      await Promise.all(updates);
      toast.success('Jobs reordered for optimal route');
      fetchData();
    } catch (error: any) {
      console.error('Failed to update job order:', error);
      toast.error('Failed to update job schedule');
    }
  };

  // Handle slot click for quick scheduling
  const handleSlotClick = (technicianId: string, time: string) => {
    if (!isManager) return;
    
    const tech = technicians.find(t => t.id === technicianId);
    setQuickScheduleState({
      open: true,
      technicianId,
      technicianName: tech?.full_name || null,
      time,
    });
  };

  // Handle job click for detail view
  const handleJobClick = (job: ScheduledJob) => {
    setSelectedJob(job);
  };

  // Mobile view
  if (isMobile) {
    return (
      <AppLayout>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Mobile Header - compact */}
          <div className="shrink-0 px-4 py-3 border-b bg-background">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg font-bold">Schedule</h1>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => setForceMobile(!forceMobile)}
              >
                {forceMobile ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                {forceMobile ? 'Desktop' : 'Mobile'}
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button variant="outline" size="sm" className="h-9" onClick={() => navigatePeriod('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-9 text-sm font-medium" onClick={goToToday}>
                {format(currentDate, 'EEE, MMM d')}
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={() => navigatePeriod('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Tabs */}
          <Tabs 
            value={mobileTab} 
            onValueChange={(v) => setMobileTab(v as 'unassigned' | 'schedule')} 
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <TabsList className="shrink-0 mx-4 mt-2 grid grid-cols-2 h-10">
              <TabsTrigger value="schedule" className="gap-1.5 text-sm h-full">
                Schedule
              </TabsTrigger>
              {isManager && (
                <TabsTrigger value="unassigned" className="gap-1.5 text-sm h-full">
                  <Clock className="w-4 h-4" />
                  Unassigned ({unassignedJobs.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="schedule" className="flex-1 m-0 p-4 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-3 pb-4">
                  {technicians.map((tech) => {
                    const dayJobs = getJobsForTechOnDay(tech.id, currentDate);
                    return (
                      <Card key={tech.id}>
                        <CardHeader className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={tech.avatar_url || undefined} />
                                <AvatarFallback className="bg-accent text-accent-foreground text-sm">
                                  {getInitials(tech.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-base">{tech.full_name || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">{dayJobs.length} jobs</p>
                              </div>
                            </div>
                            {isManager && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSlotClick(tech.id, '09:00')}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        {dayJobs.length > 0 && (
                          <CardContent className="pt-0 pb-3 px-4">
                            <div className="space-y-2">
                              {dayJobs.map((job) => (
                                <div 
                                  key={job.id} 
                                  className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                                  onClick={() => handleJobClick(job)}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="font-medium text-sm truncate">{job.title}</span>
                                    <StatusBadge status={job.status} className="text-xs px-2 py-0.5" />
                                  </div>
                                  {job.scheduled_time && (
                                    <span className="text-sm text-muted-foreground">
                                      {job.scheduled_time.slice(0, 5)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                  {technicians.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-muted-foreground text-base">
                        No technicians available
                      </p>
                      {isManager && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Invite technicians from the Users page
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {isManager && (
              <TabsContent value="unassigned" className="flex-1 m-0 p-4 overflow-hidden flex flex-col">
                <Input
                  placeholder="Search jobs..."
                  className="mb-3 h-10 text-base shrink-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <ScrollArea className="flex-1">
                  <div className="space-y-2 pb-4">
                    {unassignedJobs.map((job) => (
                      <Card key={job.id} className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-base truncate">{job.title}</h4>
                          <PriorityBadge priority={job.priority} />
                        </div>
                        {job.customer && (
                          <p className="text-sm text-muted-foreground truncate mb-1">
                            {job.customer.name}
                          </p>
                        )}
                        {job.city && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {job.city}
                          </div>
                        )}
                      </Card>
                    ))}
                    {unassignedJobs.length === 0 && (
                      <p className="text-center text-muted-foreground py-12 text-base">
                        No unassigned jobs
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Quick Schedule Dialog */}
        <QuickScheduleDialog
          open={quickScheduleState.open}
          onOpenChange={(open) => setQuickScheduleState(prev => ({ ...prev, open }))}
          technicianId={quickScheduleState.technicianId}
          technicianName={quickScheduleState.technicianName}
          date={currentDate}
          time={quickScheduleState.time}
          onScheduled={fetchData}
        />
      </AppLayout>
    );
  }

  // Desktop view
  return (
    <AppLayout>
      <div className="h-[calc(100vh-2rem)] flex flex-col">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
            <p className="text-muted-foreground">
              {isManager ? 'Click on an empty time slot to schedule a job' : "View your team's calendar"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Route optimizer for managers */}
            {isManager && view === 'day' && (
              <RouteOptimizer
                jobs={jobs}
                technicians={technicians}
                onOptimize={handleRouteOptimize}
              />
            )}
            
            {/* Unassigned panel toggle */}
            {isManager && (view === 'week' || view === 'day') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUnassignedPanel(!showUnassignedPanel)}
              >
                {showUnassignedPanel ? (
                  <PanelLeftClose className="w-4 h-4 mr-2" />
                ) : (
                  <PanelLeft className="w-4 h-4 mr-2" />
                )}
                Unassigned
              </Button>
            )}

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
        <div className="text-center font-semibold md:hidden mb-4">
          {getDateRangeLabel()}
        </div>

        {/* Day View - New Time Grid */}
        {view === 'day' && (
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Unassigned Jobs Panel (managers only) */}
            {isManager && showUnassignedPanel && (
              <div className="w-72 shrink-0">
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      Unassigned
                      <Badge variant="secondary">{unassignedJobs.length}</Badge>
                    </CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search jobs..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full px-4 pb-4">
                      <div className="space-y-2 min-h-[200px]">
                        {unassignedJobs.map((job) => (
                          <div
                            key={job.id}
                            className="p-3 bg-card border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => handleJobClick(job)}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-medium text-sm truncate">{job.title}</h4>
                              <PriorityBadge priority={job.priority} />
                            </div>
                            {job.customer && (
                              <p className="text-xs text-muted-foreground truncate mb-1">
                                {job.customer.name}
                              </p>
                            )}
                            {job.city && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="w-3 h-3" />
                                {job.city}
                              </div>
                            )}
                            {job.estimated_duration_minutes && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Clock className="w-3 h-3" />
                                {job.estimated_duration_minutes} min
                              </div>
                            )}
                          </div>
                        ))}
                        {unassignedJobs.length === 0 && (
                          <p className="text-center text-muted-foreground py-8 text-sm">
                            No unassigned jobs
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Time Grid */}
            <div className="flex-1 min-h-0">
              <TimeGridSchedule
                date={currentDate}
                technicians={technicians}
                jobs={filteredJobs}
                onSlotClick={handleSlotClick}
                onJobClick={handleJobClick}
              />
            </div>
          </div>
        )}

        {/* Week View - Simple Grid */}
        {view === 'week' && (
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Unassigned Jobs Panel (managers only) */}
            {isManager && showUnassignedPanel && (
              <div className="w-72 shrink-0">
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      Unassigned
                      <Badge variant="secondary">{unassignedJobs.length}</Badge>
                    </CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search jobs..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full px-4 pb-4">
                      <div className="space-y-2 min-h-[200px]">
                        {unassignedJobs.map((job) => (
                          <div
                            key={job.id}
                            className="p-3 bg-card border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => handleJobClick(job)}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-medium text-sm truncate">{job.title}</h4>
                              <PriorityBadge priority={job.priority} />
                            </div>
                            {job.customer && (
                              <p className="text-xs text-muted-foreground truncate">
                                {job.customer.name}
                              </p>
                            )}
                          </div>
                        ))}
                        {unassignedJobs.length === 0 && (
                          <p className="text-center text-muted-foreground py-8 text-sm">
                            No unassigned jobs
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Weekly Calendar Grid */}
            <Card className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="min-w-[900px]">
                  {/* Header with dates */}
                  <div className="grid grid-cols-[180px_repeat(7,1fr)] border-b sticky top-0 bg-card z-10">
                    <div className="p-3 font-medium text-muted-foreground flex items-center">Technician</div>
                    {weekDays.map((day) => (
                      <div 
                        key={day.toISOString()} 
                        className={cn(
                          "p-3 text-center border-l cursor-pointer hover:bg-muted/50 transition-colors",
                          isSameDay(day, new Date()) && "bg-accent/20"
                        )}
                        onClick={() => {
                          setCurrentDate(day);
                          setView('day');
                        }}
                      >
                        <div className="font-medium text-sm">{format(day, 'EEE')}</div>
                        <div className={cn(
                          "text-xl",
                          isSameDay(day, new Date()) && "text-primary font-bold"
                        )}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Technician rows */}
                  {technicians.map((tech) => (
                    <div key={tech.id} className="grid grid-cols-[180px_repeat(7,1fr)] border-b">
                      {/* Technician info */}
                      <div className="p-3 flex items-start gap-3 border-r bg-muted/30">
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={tech.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(tech.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate text-sm">{tech.full_name || 'Unknown'}</p>
                        </div>
                      </div>

                      {/* Day slots */}
                      {weekDays.map((day) => {
                        const dayJobs = getJobsForTechOnDay(tech.id, day);

                        return (
                          <div
                            key={`${tech.id}_${day.toISOString()}`}
                            className={cn(
                              "p-2 border-l min-h-[100px] cursor-pointer hover:bg-muted/30 transition-colors",
                              isSameDay(day, new Date()) && "bg-accent/10"
                            )}
                            onClick={() => {
                              setCurrentDate(day);
                              setView('day');
                            }}
                          >
                            <div className="space-y-1">
                              {dayJobs.slice(0, 3).map((job) => (
                                <div
                                  key={job.id}
                                  className={cn(
                                    "p-1.5 rounded text-xs border-l-2",
                                    job.status === 'scheduled' && "bg-blue-50 dark:bg-blue-950/30 border-l-blue-500",
                                    job.status === 'en_route' && "bg-purple-50 dark:bg-purple-950/30 border-l-purple-500",
                                    job.status === 'in_progress' && "bg-amber-50 dark:bg-amber-950/30 border-l-amber-500",
                                    job.status === 'pending' && "bg-muted border-l-muted-foreground"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleJobClick(job);
                                  }}
                                >
                                  <div className="font-medium truncate">{job.title}</div>
                                  {job.scheduled_time && (
                                    <div className="text-muted-foreground">
                                      {job.scheduled_time.slice(0, 5)}
                                    </div>
                                  )}
                                </div>
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
                    </div>
                  ))}

                  {technicians.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No technicians available
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>
        )}

        {/* Month View */}
        {view === 'month' && (
          <div className="rounded-lg border bg-background overflow-hidden flex-1">
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
                      'min-h-[100px] border-r border-b p-1 cursor-pointer hover:bg-muted/30 transition-colors',
                      isToday && 'bg-primary/5'
                    )}
                    onClick={() => {
                      setCurrentDate(day);
                      setView('day');
                    }}
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
                          open={selectedJob?.id === job.id}
                          onOpenChange={(open) => setSelectedJob(open ? job : null)}
                          onMessageClick={() => handleOpenMessageDialog(job)}
                        >
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJob(job);
                            }}
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

        {/* Quick Schedule Dialog */}
        <QuickScheduleDialog
          open={quickScheduleState.open}
          onOpenChange={(open) => setQuickScheduleState(prev => ({ ...prev, open }))}
          technicianId={quickScheduleState.technicianId}
          technicianName={quickScheduleState.technicianName}
          date={currentDate}
          time={quickScheduleState.time}
          onScheduled={fetchData}
        />

        {/* Job Detail Popover for day view */}
        {selectedJob && view === 'day' && (
          <JobDetailPopover
            job={selectedJob}
            open={!!selectedJob}
            onOpenChange={(open) => !open && setSelectedJob(null)}
            onMessageClick={() => handleOpenMessageDialog(selectedJob)}
          >
            <div className="hidden" />
          </JobDetailPopover>
        )}

        {/* Notification Dialog */}
        <ScheduleNotificationDialog
          open={notificationDialog.open}
          onOpenChange={(open) => setNotificationDialog(prev => ({ ...prev, open }))}
          customerName={notificationDialog.customerName}
          scheduledDate={notificationDialog.scheduledDate}
          scheduledTime={notificationDialog.scheduledTime}
          onConfirm={handleNotificationConfirm}
          onSkip={() => {}}
        />

        {/* Quick Message Dialog */}
        <QuickMessageDialog
          open={messageDialog.open}
          onOpenChange={(open) => setMessageDialog(prev => ({ ...prev, open }))}
          customerName={messageDialog.customerName}
          customerPhone={messageDialog.customerPhone}
          customerEmail={messageDialog.customerEmail}
          customerId={messageDialog.customerId}
          jobId={messageDialog.jobId || undefined}
        />
      </div>
    </AppLayout>
  );
}
