import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  MapPin, Clock, CheckCircle2, PlayCircle, User, 
  Camera, Pen, MessageSquare, ChevronDown, ChevronUp,
  ArrowLeft, Phone, Navigation
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PhotoUpload, PhotoGallery } from '@/components/jobs/PhotoUpload';
import { SignaturePad, SignatureDisplay } from '@/components/jobs/SignaturePad';
import { JobNotes } from '@/components/jobs/JobNotes';
import { LocationPermission } from '@/components/technician/LocationPermission';
import { notifyTechnicianEnRoute, notifyJobCompleted } from '@/lib/notifications';
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
  state: string | null;
  customer: { name: string; phone: string | null } | null;
  started_at: string | null;
  estimated_duration_minutes: number | null;
  actual_duration_minutes: number | null;
  completed_at: string | null;
}

interface ChecklistItem {
  id: string;
  item_text: string;
  is_completed: boolean;
}

interface JobPhoto {
  id: string;
  photo_url: string;
  photo_type: string;
  caption: string | null;
  created_at: string;
}

interface JobNote {
  id: string;
  note_text: string;
  created_at: string;
  author?: { full_name: string | null };
}

interface JobSignature {
  signature_url: string;
  signer_name: string;
  signed_at: string;
}

export default function MyJobs() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [notes, setNotes] = useState<JobNote[]>([]);
  const [signature, setSignature] = useState<JobSignature | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    photos: true,
    notes: true,
    checklist: true,
  });

  useEffect(() => {
    if (user) fetchMyJobs();
  }, [user]);

  const fetchMyJobs = async () => {
    try {
      const { data } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          scheduled_date,
          scheduled_time,
          address,
          city,
          state,
          started_at,
          completed_at,
          estimated_duration_minutes,
          actual_duration_minutes,
          customer:customers(name, phone)
        `)
        .eq('assigned_technician_id', user?.id)
        .neq('status', 'cancelled')
        .order('scheduled_date', { ascending: true });

      setJobs(data as unknown as Job[] || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobDetails = async (jobId: string) => {
    const { data: checklistData } = await supabase
      .from('job_checklist_items')
      .select('*')
      .eq('job_id', jobId)
      .order('sort_order');
    setChecklist(checklistData || []);

    const { data: photosData } = await supabase
      .from('job_photos')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    setPhotos(photosData || []);

    const { data: notesData } = await supabase
      .from('job_notes')
      .select(`
        id,
        note_text,
        created_at,
        author:profiles!author_id(full_name)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    const formattedNotes = (notesData || []).map(n => ({
      ...n,
      author: Array.isArray(n.author) ? n.author[0] : n.author,
    }));
    setNotes(formattedNotes);

    const { data: sigData } = await supabase
      .from('job_signatures')
      .select('signature_url, signer_name, signed_at')
      .eq('job_id', jobId)
      .single();
    setSignature(sigData || null);
  };

  const handleSelectJob = async (job: Job) => {
    setSelectedJob(job);
    await fetchJobDetails(job.id);
  };

  const handleBackToList = () => {
    setSelectedJob(null);
  };

  const handleEnRoute = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'en_route' })
        .eq('id', jobId);

      if (error) throw error;
      toast.success('Status updated to En Route');
      notifyTechnicianEnRoute(jobId);
      fetchMyJobs();
      if (selectedJob?.id === jobId) {
        setSelectedJob(prev => prev ? { ...prev, status: 'en_route' } : null);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleStartJob = async (jobId: string) => {
    try {
      const startedAt = new Date().toISOString();
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'in_progress',
          started_at: startedAt
        })
        .eq('id', jobId);

      if (error) throw error;
      toast.success('Work started - timer running');
      fetchMyJobs();
      if (selectedJob?.id === jobId) {
        setSelectedJob(prev => prev ? { ...prev, status: 'in_progress', started_at: startedAt } : null);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCompleteJob = async (jobId: string) => {
    if (!signature) {
      toast.error('Please get customer signature before completing');
      setShowSignaturePad(true);
      return;
    }

    try {
      const completedAt = new Date();
      let actualDurationMinutes: number | null = null;
      if (selectedJob?.started_at) {
        const startedAt = new Date(selectedJob.started_at);
        actualDurationMinutes = Math.round((completedAt.getTime() - startedAt.getTime()) / (1000 * 60));
      }

      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'completed', 
          completed_at: completedAt.toISOString(),
          actual_duration_minutes: actualDurationMinutes
        })
        .eq('id', jobId);

      if (error) throw error;
      
      const durationText = actualDurationMinutes 
        ? ` (${formatDurationMinutes(actualDurationMinutes)})` 
        : '';
      toast.success(`Job completed${durationText}!`);
      notifyJobCompleted(jobId);
      fetchMyJobs();
      setSelectedJob(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const formatDurationMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getElapsedTime = (startedAt: string): string => {
    const start = new Date(startedAt);
    const now = new Date();
    const minutes = Math.round((now.getTime() - start.getTime()) / (1000 * 60));
    return formatDurationMinutes(minutes);
  };

  const handleToggleChecklistItem = async (itemId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('job_checklist_items')
        .update({ 
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          completed_by: isCompleted ? user?.id : null
        })
        .eq('id', itemId);

      if (error) throw error;
      setChecklist(prev => prev.map(item => 
        item.id === itemId ? { ...item, is_completed: isCompleted } : item
      ));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getFullAddress = (job: Job) => {
    return [job.address, job.city, job.state].filter(Boolean).join(', ');
  };

  const openDirections = (job: Job) => {
    const address = getFullAddress(job);
    if (address) {
      window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address)}`, '_blank');
    }
  };

  const activeJobs = jobs.filter(j => ['scheduled', 'en_route', 'in_progress'].includes(j.status));
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const pendingJobs = jobs.filter(j => j.status === 'pending');

  // Mobile: Show either list or detail
  const showMobileDetail = isMobile && selectedJob;

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header - hide on mobile when viewing detail */}
        {!showMobileDetail && (
          <>
            <div className="px-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Jobs</h1>
              <p className="text-sm md:text-base text-muted-foreground">Your assigned jobs</p>
            </div>
            
            {/* Location Permission Banner */}
            <LocationPermission />
          </>
        )}

        {/* Mobile Detail View */}
        {showMobileDetail ? (
          <MobileJobDetail
            job={selectedJob}
            checklist={checklist}
            photos={photos}
            notes={notes}
            signature={signature}
            expandedSections={expandedSections}
            showSignaturePad={showSignaturePad}
            onBack={handleBackToList}
            onEnRoute={handleEnRoute}
            onStartJob={handleStartJob}
            onCompleteJob={handleCompleteJob}
            onToggleChecklistItem={handleToggleChecklistItem}
            onToggleSection={toggleSection}
            onOpenSignaturePad={() => setShowSignaturePad(true)}
            onSignatureComplete={() => fetchJobDetails(selectedJob.id)}
            onPhotoUploadComplete={() => fetchJobDetails(selectedJob.id)}
            onNoteAdded={() => fetchJobDetails(selectedJob.id)}
            formatDurationMinutes={formatDurationMinutes}
            getElapsedTime={getElapsedTime}
            openDirections={openDirections}
            getFullAddress={getFullAddress}
            setShowSignaturePad={setShowSignaturePad}
          />
        ) : (
          /* Desktop/Tablet Layout or Mobile List */
          <div className={cn("grid gap-4 md:gap-6", !isMobile && "lg:grid-cols-2")}>
            {/* Jobs List */}
            <div className="space-y-3 md:space-y-4">
              <Tabs defaultValue="active">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="active" className="text-xs md:text-sm">
                    Active ({activeJobs.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs md:text-sm">
                    Pending ({pendingJobs.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="text-xs md:text-sm">
                    Done ({completedJobs.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-3 mt-4">
                  {activeJobs.map((job) => (
                    <MobileJobCard 
                      key={job.id} 
                      job={job} 
                      isSelected={selectedJob?.id === job.id}
                      onClick={() => handleSelectJob(job)}
                    />
                  ))}
                  {activeJobs.length === 0 && (
                    <EmptyState message="No active jobs" />
                  )}
                </TabsContent>

                <TabsContent value="pending" className="space-y-3 mt-4">
                  {pendingJobs.map((job) => (
                    <MobileJobCard 
                      key={job.id} 
                      job={job} 
                      isSelected={selectedJob?.id === job.id}
                      onClick={() => handleSelectJob(job)}
                    />
                  ))}
                  {pendingJobs.length === 0 && (
                    <EmptyState message="No pending jobs" />
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-3 mt-4">
                  {completedJobs.map((job) => (
                    <MobileJobCard 
                      key={job.id} 
                      job={job} 
                      isSelected={selectedJob?.id === job.id}
                      onClick={() => handleSelectJob(job)}
                    />
                  ))}
                  {completedJobs.length === 0 && (
                    <EmptyState message="No completed jobs" />
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Desktop Job Details */}
            {!isMobile && (
              <div>
                {selectedJob ? (
                  <DesktopJobDetail
                    job={selectedJob}
                    checklist={checklist}
                    photos={photos}
                    notes={notes}
                    signature={signature}
                    expandedSections={expandedSections}
                    showSignaturePad={showSignaturePad}
                    onEnRoute={handleEnRoute}
                    onStartJob={handleStartJob}
                    onCompleteJob={handleCompleteJob}
                    onToggleChecklistItem={handleToggleChecklistItem}
                    onToggleSection={toggleSection}
                    onOpenSignaturePad={() => setShowSignaturePad(true)}
                    onSignatureComplete={() => fetchJobDetails(selectedJob.id)}
                    onPhotoUploadComplete={() => fetchJobDetails(selectedJob.id)}
                    onNoteAdded={() => fetchJobDetails(selectedJob.id)}
                    formatDurationMinutes={formatDurationMinutes}
                    getElapsedTime={getElapsedTime}
                    setShowSignaturePad={setShowSignaturePad}
                  />
                ) : (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">Select a job to view details</p>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* Signature Pad Dialog */}
        {selectedJob && (
          <SignaturePad
            jobId={selectedJob.id}
            open={showSignaturePad}
            onOpenChange={setShowSignaturePad}
            onSignatureComplete={() => fetchJobDetails(selectedJob.id)}
          />
        )}
      </div>
    </AppLayout>
  );
}

// Empty state component
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p>{message}</p>
    </div>
  );
}

// Mobile-optimized job card
function MobileJobCard({ 
  job, 
  isSelected, 
  onClick 
}: { 
  job: Job; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusColors: Record<string, string> = {
    scheduled: 'border-l-blue-500',
    en_route: 'border-l-amber-500',
    in_progress: 'border-l-green-500',
    completed: 'border-l-gray-400',
    pending: 'border-l-gray-300',
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all border-l-4 active:scale-[0.98]",
        statusColors[job.status] || 'border-l-gray-300',
        isSelected ? "ring-2 ring-primary" : "hover:shadow-md"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="font-semibold truncate">{job.title}</h3>
            {job.customer && (
              <p className="text-sm text-muted-foreground truncate">
                {job.customer.name}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {job.scheduled_date && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(job.scheduled_date), 'MMM d')}
                  {job.scheduled_time && ` · ${job.scheduled_time.slice(0, 5)}`}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={job.status} />
            <PriorityBadge priority={job.priority} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mobile full-screen job detail
function MobileJobDetail({
  job,
  checklist,
  photos,
  notes,
  signature,
  expandedSections,
  showSignaturePad,
  onBack,
  onEnRoute,
  onStartJob,
  onCompleteJob,
  onToggleChecklistItem,
  onToggleSection,
  onOpenSignaturePad,
  onSignatureComplete,
  onPhotoUploadComplete,
  onNoteAdded,
  formatDurationMinutes,
  getElapsedTime,
  openDirections,
  getFullAddress,
  setShowSignaturePad,
}: {
  job: Job;
  checklist: ChecklistItem[];
  photos: JobPhoto[];
  notes: JobNote[];
  signature: JobSignature | null;
  expandedSections: { photos: boolean; notes: boolean; checklist: boolean };
  showSignaturePad: boolean;
  onBack: () => void;
  onEnRoute: (id: string) => void;
  onStartJob: (id: string) => void;
  onCompleteJob: (id: string) => void;
  onToggleChecklistItem: (id: string, completed: boolean) => void;
  onToggleSection: (section: 'photos' | 'notes' | 'checklist') => void;
  onOpenSignaturePad: () => void;
  onSignatureComplete: () => void;
  onPhotoUploadComplete: () => void;
  onNoteAdded: () => void;
  formatDurationMinutes: (mins: number) => string;
  getElapsedTime: (started: string) => string;
  openDirections: (job: Job) => void;
  getFullAddress: (job: Job) => string;
  setShowSignaturePad: (show: boolean) => void;
}) {
  const { user } = useAuth();
  const address = getFullAddress(job);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{job.title}</h1>
          {job.customer && (
            <p className="text-sm text-muted-foreground truncate">{job.customer.name}</p>
          )}
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="p-4 space-y-4">
          {/* Quick Actions */}
          <div className="flex gap-2">
            {job.customer?.phone && (
              <Button variant="outline" size="sm" className="flex-1 gap-2" asChild>
                <a href={`tel:${job.customer.phone}`}>
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              </Button>
            )}
            {address && (
              <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => openDirections(job)}>
                <Navigation className="w-4 h-4" />
                Directions
              </Button>
            )}
          </div>

          {/* Schedule & Location */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {job.scheduled_date && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">
                    {format(new Date(job.scheduled_date), 'EEEE, MMMM d')}
                    {job.scheduled_time && ` at ${job.scheduled_time.slice(0, 5)}`}
                  </span>
                </div>
              )}
              {address && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {job.description && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{job.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Time Tracking */}
          {(job.status === 'in_progress' || job.status === 'completed') && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Time Tracking</h4>
                {job.status === 'in_progress' && job.started_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Elapsed Time</span>
                    <span className="font-mono text-sm font-medium text-primary">
                      {getElapsedTime(job.started_at)}
                    </span>
                  </div>
                )}
                {job.estimated_duration_minutes && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Estimated</span>
                    <span className="text-sm">{formatDurationMinutes(job.estimated_duration_minutes)}</span>
                  </div>
                )}
                {job.status === 'completed' && job.actual_duration_minutes && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Actual</span>
                      <span className="font-medium text-sm">{formatDurationMinutes(job.actual_duration_minutes)}</span>
                    </div>
                    {job.estimated_duration_minutes && (
                      <div className="flex items-center justify-between border-t pt-2">
                        <span className="text-sm">Variance</span>
                        <span className={cn(
                          "font-medium text-sm",
                          job.actual_duration_minutes <= job.estimated_duration_minutes 
                            ? "text-green-600" 
                            : "text-red-600"
                        )}>
                          {job.actual_duration_minutes <= job.estimated_duration_minutes ? '−' : '+'}
                          {formatDurationMinutes(Math.abs(job.actual_duration_minutes - job.estimated_duration_minutes))}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Photos */}
          <Collapsible open={expandedSections.photos}>
            <Card>
              <CollapsibleTrigger 
                className="w-full p-4 flex items-center justify-between"
                onClick={() => onToggleSection('photos')}
              >
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  <span className="font-medium">Photos</span>
                  <span className="text-xs text-muted-foreground">({photos.length})</span>
                </div>
                {expandedSections.photos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4">
                  {job.status !== 'completed' && (
                    <div className="flex gap-2 mb-4">
                      <PhotoUpload jobId={job.id} photoType="before" onUploadComplete={onPhotoUploadComplete} />
                      <PhotoUpload jobId={job.id} photoType="during" onUploadComplete={onPhotoUploadComplete} />
                      <PhotoUpload jobId={job.id} photoType="after" onUploadComplete={onPhotoUploadComplete} />
                    </div>
                  )}
                  <PhotoGallery jobId={job.id} photos={photos} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Checklist */}
          {checklist.length > 0 && (
            <Collapsible open={expandedSections.checklist}>
              <Card>
                <CollapsibleTrigger 
                  className="w-full p-4 flex items-center justify-between"
                  onClick={() => onToggleSection('checklist')}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium">Checklist</span>
                    <span className="text-xs text-muted-foreground">
                      ({checklist.filter(i => i.is_completed).length}/{checklist.length})
                    </span>
                  </div>
                  {expandedSections.checklist ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 space-y-3">
                    {checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 min-h-[44px]">
                        <Checkbox
                          id={item.id}
                          checked={item.is_completed}
                          onCheckedChange={(checked) => onToggleChecklistItem(item.id, checked as boolean)}
                          disabled={job.status === 'completed'}
                          className="w-6 h-6"
                        />
                        <label 
                          htmlFor={item.id}
                          className={cn(
                            "text-sm flex-1",
                            item.is_completed && "line-through text-muted-foreground"
                          )}
                        >
                          {item.item_text}
                        </label>
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Notes */}
          <Collapsible open={expandedSections.notes}>
            <Card>
              <CollapsibleTrigger 
                className="w-full p-4 flex items-center justify-between"
                onClick={() => onToggleSection('notes')}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-medium">Notes</span>
                  <span className="text-xs text-muted-foreground">({notes.length})</span>
                </div>
                {expandedSections.notes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4">
                  <JobNotes 
                    jobId={job.id} 
                    notes={notes}
                    onNoteAdded={onNoteAdded}
                    readOnly={job.status === 'completed'}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Signature */}
          {signature ? (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Pen className="w-4 h-4" />
                  Customer Signature
                </h3>
                <SignatureDisplay signature={signature} />
              </CardContent>
            </Card>
          ) : job.status === 'in_progress' && (
            <Button variant="outline" className="w-full gap-2" onClick={onOpenSignaturePad}>
              <Pen className="w-4 h-4" />
              Get Customer Signature
            </Button>
          )}
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      {job.status !== 'completed' && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 safe-area-pb">
          {job.status === 'scheduled' && (
            <Button className="w-full h-12 text-base gap-2" onClick={() => onEnRoute(job.id)}>
              <MapPin className="w-5 h-5" />
              I'm On My Way
            </Button>
          )}
          {job.status === 'en_route' && (
            <Button className="w-full h-12 text-base gap-2" onClick={() => onStartJob(job.id)}>
              <PlayCircle className="w-5 h-5" />
              Start Work
            </Button>
          )}
          {job.status === 'in_progress' && (
            <Button className="w-full h-12 text-base gap-2" onClick={() => onCompleteJob(job.id)}>
              <CheckCircle2 className="w-5 h-5" />
              Complete Job
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Desktop job detail (original layout)
function DesktopJobDetail({
  job,
  checklist,
  photos,
  notes,
  signature,
  expandedSections,
  showSignaturePad,
  onEnRoute,
  onStartJob,
  onCompleteJob,
  onToggleChecklistItem,
  onToggleSection,
  onOpenSignaturePad,
  onSignatureComplete,
  onPhotoUploadComplete,
  onNoteAdded,
  formatDurationMinutes,
  getElapsedTime,
  setShowSignaturePad,
}: {
  job: Job;
  checklist: ChecklistItem[];
  photos: JobPhoto[];
  notes: JobNote[];
  signature: JobSignature | null;
  expandedSections: { photos: boolean; notes: boolean; checklist: boolean };
  showSignaturePad: boolean;
  onEnRoute: (id: string) => void;
  onStartJob: (id: string) => void;
  onCompleteJob: (id: string) => void;
  onToggleChecklistItem: (id: string, completed: boolean) => void;
  onToggleSection: (section: 'photos' | 'notes' | 'checklist') => void;
  onOpenSignaturePad: () => void;
  onSignatureComplete: () => void;
  onPhotoUploadComplete: () => void;
  onNoteAdded: () => void;
  formatDurationMinutes: (mins: number) => string;
  getElapsedTime: (started: string) => string;
  setShowSignaturePad: (show: boolean) => void;
}) {
  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">{job.title}</h2>
            {job.customer && (
              <p className="text-muted-foreground">{job.customer.name}</p>
            )}
          </div>
          <div className="flex gap-2">
            <PriorityBadge priority={job.priority} />
            <StatusBadge status={job.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {job.description && (
          <div>
            <h3 className="font-medium mb-2">Description</h3>
            <p className="text-sm text-muted-foreground">{job.description}</p>
          </div>
        )}

        <div className="space-y-2 text-sm">
          {job.scheduled_date && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>
                {format(new Date(job.scheduled_date), 'EEEE, MMMM d, yyyy')}
                {job.scheduled_time && ` at ${job.scheduled_time.slice(0, 5)}`}
              </span>
            </div>
          )}
          {(job.address || job.city) && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>
                {[job.address, job.city, job.state].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {job.customer?.phone && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <a href={`tel:${job.customer.phone}`} className="hover:text-accent">
                {job.customer.phone}
              </a>
            </div>
          )}
        </div>

        {/* Time Tracking Display */}
        {(job.status === 'in_progress' || job.status === 'completed') && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Time Tracking</h4>
            {job.status === 'in_progress' && job.started_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Elapsed Time</span>
                <span className="font-mono text-sm font-medium text-primary">
                  {getElapsedTime(job.started_at)}
                </span>
              </div>
            )}
            {job.estimated_duration_minutes && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Estimated</span>
                <span className="text-sm">{formatDurationMinutes(job.estimated_duration_minutes)}</span>
              </div>
            )}
            {job.status === 'completed' && job.actual_duration_minutes && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Actual</span>
                  <span className="font-medium text-sm">{formatDurationMinutes(job.actual_duration_minutes)}</span>
                </div>
                {job.estimated_duration_minutes && (
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-sm">Variance</span>
                    <span className={cn(
                      "font-medium text-sm",
                      job.actual_duration_minutes <= job.estimated_duration_minutes 
                        ? "text-green-600" 
                        : "text-red-600"
                    )}>
                      {job.actual_duration_minutes <= job.estimated_duration_minutes ? '−' : '+'}
                      {formatDurationMinutes(Math.abs(job.actual_duration_minutes - job.estimated_duration_minutes))}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Photos Section */}
        <Collapsible open={expandedSections.photos}>
          <CollapsibleTrigger 
            className="flex items-center justify-between w-full py-2"
            onClick={() => onToggleSection('photos')}
          >
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <h3 className="font-medium">Photos</h3>
              <span className="text-xs text-muted-foreground">({photos.length})</span>
            </div>
            {expandedSections.photos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            {job.status !== 'completed' && (
              <div className="flex gap-2 mb-4">
                <PhotoUpload jobId={job.id} photoType="before" onUploadComplete={onPhotoUploadComplete} />
                <PhotoUpload jobId={job.id} photoType="during" onUploadComplete={onPhotoUploadComplete} />
                <PhotoUpload jobId={job.id} photoType="after" onUploadComplete={onPhotoUploadComplete} />
              </div>
            )}
            <PhotoGallery jobId={job.id} photos={photos} />
          </CollapsibleContent>
        </Collapsible>

        {/* Notes Section */}
        <Collapsible open={expandedSections.notes}>
          <CollapsibleTrigger 
            className="flex items-center justify-between w-full py-2"
            onClick={() => onToggleSection('notes')}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <h3 className="font-medium">Notes</h3>
              <span className="text-xs text-muted-foreground">({notes.length})</span>
            </div>
            {expandedSections.notes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <JobNotes 
              jobId={job.id} 
              notes={notes}
              onNoteAdded={onNoteAdded}
              readOnly={job.status === 'completed'}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Checklist */}
        {checklist.length > 0 && (
          <Collapsible open={expandedSections.checklist}>
            <CollapsibleTrigger 
              className="flex items-center justify-between w-full py-2"
              onClick={() => onToggleSection('checklist')}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <h3 className="font-medium">Checklist</h3>
                <span className="text-xs text-muted-foreground">
                  ({checklist.filter(i => i.is_completed).length}/{checklist.length})
                </span>
              </div>
              {expandedSections.checklist ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <Checkbox
                      id={item.id}
                      checked={item.is_completed}
                      onCheckedChange={(checked) => onToggleChecklistItem(item.id, checked as boolean)}
                      disabled={job.status === 'completed'}
                    />
                    <label 
                      htmlFor={item.id}
                      className={cn(
                        "text-sm",
                        item.is_completed && "line-through text-muted-foreground"
                      )}
                    >
                      {item.item_text}
                    </label>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Signature */}
        {signature ? (
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Pen className="w-4 h-4" />
              Customer Signature
            </h3>
            <SignatureDisplay signature={signature} />
          </div>
        ) : job.status === 'in_progress' && (
          <Button variant="outline" className="w-full gap-2" onClick={onOpenSignaturePad}>
            <Pen className="w-4 h-4" />
            Get Customer Signature
          </Button>
        )}

        {/* Actions */}
        {job.status !== 'completed' && (
          <div className="flex gap-3 pt-4 border-t">
            {job.status === 'scheduled' && (
              <Button className="flex-1 gap-2" variant="secondary" onClick={() => onEnRoute(job.id)}>
                <MapPin className="w-4 h-4" />
                En Route
              </Button>
            )}
            {job.status === 'en_route' && (
              <Button className="flex-1 gap-2" onClick={() => onStartJob(job.id)}>
                <PlayCircle className="w-4 h-4" />
                Start Work
              </Button>
            )}
            {job.status === 'in_progress' && (
              <Button className="flex-1 gap-2" onClick={() => onCompleteJob(job.id)}>
                <CheckCircle2 className="w-4 h-4" />
                Complete Job
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
