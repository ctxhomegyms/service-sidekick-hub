import { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScheduleHeader } from '@/components/schedule/ScheduleHeader';
import { CleanTimeGrid } from '@/components/schedule/CleanTimeGrid';
import { UnassignedJobsPanel } from '@/components/schedule/UnassignedJobsPanel';
import { JobDetailPopover } from '@/components/schedule/JobDetailPopover';
import { ScheduleNotificationDialog } from '@/components/schedule/ScheduleNotificationDialog';
import { QuickMessageDialog } from '@/components/schedule/QuickMessageDialog';
import { ScheduledJob, Technician } from '@/components/schedule/TimeGridSchedule';
import { notifyJobScheduled } from '@/lib/notifications';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type ScheduleView = 'day' | 'week';

export default function Schedule() {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ScheduleView>('day');
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<ScheduledJob | null>(null);
  const [showUnassignedPanel, setShowUnassignedPanel] = useState(true);
  
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

  // Calculate week range
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  useEffect(() => {
    fetchData();
  }, [currentDate, view]);

  const fetchData = async () => {
    try {
      let startDate: string;
      let endDate: string;

      if (view === 'day') {
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

  // Unassigned jobs
  const unassignedJobs = useMemo(() => {
    return jobs.filter(job => !job.assigned_technician_id || !job.scheduled_date);
  }, [jobs]);

  const getJobsForTechOnDay = (techId: string, date: Date) => {
    return jobs.filter(job => 
      job.assigned_technician_id === techId &&
      job.scheduled_date &&
      isSameDay(parseISO(job.scheduled_date), date)
    );
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (view === 'day') {
      setCurrentDate((current) => addDays(current, direction === 'next' ? 1 : -1));
    } else {
      setCurrentDate((current) => (direction === 'next' ? addWeeks(current, 1) : subWeeks(current, 1)));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleViewChange = (newView: ScheduleView) => {
    setView(newView);
  };

  const handleJobClick = (job: ScheduledJob) => {
    setSelectedJob(job);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'T';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-2rem)] flex flex-col gap-4">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between">
          <ScheduleHeader
            currentDate={currentDate}
            view={view}
            onDateChange={setCurrentDate}
            onViewChange={handleViewChange}
            onToday={goToToday}
            onPrevious={() => navigatePeriod('prev')}
            onNext={() => navigatePeriod('next')}
            onNewJob={() => navigate('/jobs?create=true')}
            showNewJobButton={isManager}
          />

          {/* Unassigned panel toggle */}
          {isManager && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setShowUnassignedPanel(!showUnassignedPanel)}
            >
              {showUnassignedPanel ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeft className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {showUnassignedPanel ? 'Hide' : 'Show'} Unassigned ({unassignedJobs.length})
              </span>
            </Button>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Unassigned Jobs Panel (managers only) */}
          {isManager && showUnassignedPanel && (
            <UnassignedJobsPanel
              jobs={unassignedJobs}
              onJobClick={handleJobClick}
              className="w-64 shrink-0"
            />
          )}

          {/* Day View - Clean Time Grid */}
          {view === 'day' && (
            <div className="flex-1 min-h-0">
              <CleanTimeGrid
                date={currentDate}
                technicians={technicians}
                jobs={jobs}
                onJobClick={handleJobClick}
                onScheduled={fetchData}
                isManager={isManager}
              />
            </div>
          )}

          {/* Week View - Tech Rows */}
          {view === 'week' && (
            <Card className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="min-w-[900px]">
                  {/* Header with dates */}
                  <div className="grid grid-cols-[180px_repeat(7,1fr)] border-b sticky top-0 bg-card z-10">
                    <div className="p-3 font-medium text-sm text-muted-foreground flex items-center">
                      Technician
                    </div>
                    {weekDays.map((day) => (
                      <div 
                        key={day.toISOString()} 
                        className={cn(
                          "p-2.5 text-center border-l cursor-pointer hover:bg-muted/30 transition-colors",
                          isSameDay(day, new Date()) && "bg-primary/5"
                        )}
                        onClick={() => {
                          setCurrentDate(day);
                          setView('day');
                        }}
                      >
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {format(day, 'EEE')}
                        </div>
                        <div className={cn(
                          "text-lg font-semibold mt-0.5",
                          isSameDay(day, new Date()) && "text-primary"
                        )}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Technician rows */}
                  {technicians.map((tech) => (
                    <div key={tech.id} className="grid grid-cols-[180px_repeat(7,1fr)] border-b last:border-b-0">
                      {/* Technician info */}
                      <div className="p-3 flex items-center gap-2.5 border-r bg-muted/20">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={tech.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {getInitials(tech.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm truncate">
                          {tech.full_name || 'Unknown'}
                        </span>
                      </div>

                      {/* Day slots */}
                      {weekDays.map((day) => {
                        const dayJobs = getJobsForTechOnDay(tech.id, day);

                        return (
                          <div
                            key={`${tech.id}_${day.toISOString()}`}
                            className={cn(
                              "p-1.5 border-l min-h-[80px] cursor-pointer hover:bg-muted/20 transition-colors",
                              isSameDay(day, new Date()) && "bg-primary/5"
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
                                    "p-1.5 rounded text-xs border-l-2 bg-card shadow-sm",
                                    job.status === 'scheduled' && "border-l-blue-500",
                                    job.status === 'en_route' && "border-l-purple-500",
                                    job.status === 'in_progress' && "border-l-amber-500",
                                    job.status === 'pending' && "border-l-muted-foreground/50"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleJobClick(job);
                                  }}
                                >
                                  <div className="font-medium truncate">{job.title}</div>
                                  {job.scheduled_time && (
                                    <div className="text-muted-foreground text-[10px] mt-0.5">
                                      {job.scheduled_time.slice(0, 5)}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {dayJobs.length > 3 && (
                                <div className="text-[10px] text-muted-foreground pl-1 font-medium">
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
                    <div className="p-12 text-center text-muted-foreground">
                      No technicians available
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>
      </div>

      {/* Job Detail Popover */}
      {selectedJob && (
        <JobDetailPopover
          job={selectedJob}
          open={!!selectedJob}
          onOpenChange={(open) => !open && setSelectedJob(null)}
          onMessageClick={() => handleOpenMessageDialog(selectedJob)}
        >
          <div />
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
        onSkip={() => setNotificationDialog(prev => ({ ...prev, open: false }))}
      />

      {/* Quick Message Dialog */}
      <QuickMessageDialog
        open={messageDialog.open}
        onOpenChange={(open) => setMessageDialog(prev => ({ ...prev, open }))}
        customerName={messageDialog.customerName}
        customerPhone={messageDialog.customerPhone}
        customerEmail={messageDialog.customerEmail}
        customerId={messageDialog.customerId}
        jobId={messageDialog.jobId}
      />
    </AppLayout>
  );
}
