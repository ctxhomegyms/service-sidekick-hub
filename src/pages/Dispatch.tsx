import { useState, useEffect, useCallback } from 'react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ChevronLeft, ChevronRight, Search, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { RouteOptimizer } from '@/components/dispatch/RouteOptimizer';
import { notifyJobScheduled } from '@/lib/notifications';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  assigned_technician_id: string | null;
  estimated_duration_minutes: number | null;
  latitude: number | null;
  longitude: number | null;
  customer: { name: string } | null;
}

interface Technician {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function Dispatch() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [jobs, setJobs] = useState<Job[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetchData();
  }, [weekStart]);

  const fetchData = async () => {
    try {
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
            scheduled_date, scheduled_time, address, city,
            assigned_technician_id, estimated_duration_minutes,
            latitude, longitude,
            customer:customers(name)
          `)
          .not('status', 'in', '("completed","cancelled")'),
      ]);

      setTechnicians(techRes.data || []);
      setJobs(jobsRes.data as unknown as Job[] || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dispatch data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { draggableId, destination } = result;

    if (!destination) return;

    const [destType, ...destParts] = destination.droppableId.split('_');
    
    if (destType === 'unassigned') {
      // Move job back to unassigned
      try {
        const { error } = await supabase
          .from('jobs')
          .update({ 
            assigned_technician_id: null,
            scheduled_date: null,
            scheduled_time: null,
            status: 'pending'
          })
          .eq('id', draggableId);

        if (error) throw error;
        toast.success('Job unassigned');
        fetchData();
      } catch (error: any) {
        toast.error(error.message);
      }
    } else if (destType === 'slot') {
      // Assign to technician on specific date
      const [techId, dateStr] = destParts;
      const slotTime = destination.index * 30; // Convert to minutes from 8:00 AM
      const hours = Math.floor(slotTime / 60) + 8;
      const minutes = slotTime % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

      try {
        const { error } = await supabase
          .from('jobs')
          .update({ 
            assigned_technician_id: techId,
            scheduled_date: dateStr,
            scheduled_time: timeStr,
            status: 'scheduled'
          })
          .eq('id', draggableId);

        if (error) throw error;
        
        // Send notification to customer
        notifyJobScheduled(draggableId);
        
        toast.success('Job scheduled');
        fetchData();
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  // Unassigned jobs (no technician or not scheduled in current week)
  const unassignedJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customer?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isUnassigned = !job.assigned_technician_id || !job.scheduled_date;
    return matchesSearch && isUnassigned;
  });

  const getJobsForSlot = (techId: string, date: Date) => {
    return jobs.filter(job => 
      job.assigned_technician_id === techId &&
      job.scheduled_date &&
      isSameDay(parseISO(job.scheduled_date), date)
    );
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'T';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleRouteOptimize = async (technicianId: string, optimizedJobIds: string[]) => {
    // Update job times based on optimized order
    // Jobs will be scheduled 30 minutes apart starting at 8:00 AM
    try {
      const updates = optimizedJobIds.map((jobId, index) => {
        const hours = Math.floor((index * 60) / 60) + 8; // 60 min intervals starting at 8 AM
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

  return (
    <AppLayout>
      <div className="h-[calc(100vh-2rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dispatch Board</h1>
            <p className="text-muted-foreground">Drag and drop jobs to schedule</p>
          </div>
          
          <div className="flex items-center gap-2">
            <RouteOptimizer
              jobs={jobs}
              technicians={technicians}
              onOptimize={handleRouteOptimize}
            />
            <Button variant="outline" size="icon" onClick={() => setWeekStart(prev => addDays(prev, -7))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => setWeekStart(prev => addDays(prev, 7))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Unassigned Jobs Panel */}
            <div className="w-80 shrink-0">
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
                  <Droppable droppableId="unassigned">
                    {(provided, snapshot) => (
                      <ScrollArea className="h-full px-4 pb-4">
                        <div 
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "space-y-2 min-h-[200px]",
                            snapshot.isDraggingOver && "bg-accent/30 rounded-lg"
                          )}
                        >
                          {unassignedJobs.map((job, index) => (
                            <Draggable key={job.id} draggableId={job.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={cn(
                                    "p-3 bg-card border rounded-lg transition-shadow",
                                    snapshot.isDragging && "shadow-lg ring-2 ring-accent"
                                  )}
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
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {unassignedJobs.length === 0 && (
                            <p className="text-center text-muted-foreground py-8 text-sm">
                              No unassigned jobs
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Calendar Grid */}
            <Card className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="min-w-[900px]">
                  {/* Header with dates */}
                  <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b sticky top-0 bg-card z-10">
                    <div className="p-3 font-medium text-muted-foreground">Technician</div>
                    {weekDays.map((day) => (
                      <div 
                        key={day.toISOString()} 
                        className={cn(
                          "p-3 text-center border-l",
                          isSameDay(day, new Date()) && "bg-accent/20"
                        )}
                      >
                        <div className="font-medium">{format(day, 'EEE')}</div>
                        <div className={cn(
                          "text-2xl",
                          isSameDay(day, new Date()) && "text-accent font-bold"
                        )}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Technician rows */}
                  {technicians.map((tech) => (
                    <div key={tech.id} className="grid grid-cols-[200px_repeat(7,1fr)] border-b">
                      {/* Technician info */}
                      <div className="p-3 flex items-start gap-3 border-r bg-muted/30">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={tech.avatar_url || undefined} />
                          <AvatarFallback className="bg-accent text-accent-foreground">
                            {getInitials(tech.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate text-sm">{tech.full_name || 'Unknown'}</p>
                        </div>
                      </div>

                      {/* Day slots */}
                      {weekDays.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dayJobs = getJobsForSlot(tech.id, day);

                        return (
                          <Droppable key={`${tech.id}_${dateStr}`} droppableId={`slot_${tech.id}_${dateStr}`}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={cn(
                                  "p-2 border-l min-h-[120px] transition-colors",
                                  isSameDay(day, new Date()) && "bg-accent/10",
                                  snapshot.isDraggingOver && "bg-accent/30"
                                )}
                              >
                                <div className="space-y-1">
                                  {dayJobs.map((job, index) => (
                                    <Draggable key={job.id} draggableId={job.id} index={index}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={cn(
                                            "p-2 rounded text-xs border",
                                            "bg-card hover:shadow-md transition-shadow",
                                            snapshot.isDragging && "shadow-lg ring-2 ring-accent"
                                          )}
                                        >
                                          <div className="flex items-center justify-between gap-1 mb-1">
                                            <span className="font-medium truncate">{job.title}</span>
                                            <StatusBadge status={job.status} className="text-[10px] px-1 py-0" />
                                          </div>
                                          {job.scheduled_time && (
                                            <span className="text-muted-foreground">
                                              {job.scheduled_time.slice(0, 5)}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                </div>
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
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
        </DragDropContext>
      </div>
    </AppLayout>
  );
}
