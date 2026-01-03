import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  MapPin, Clock, CheckCircle2, PlayCircle, User, Power, 
  Camera, Pen, MessageSquare, ChevronDown, ChevronUp 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
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
  const { isOnShift, toggleShift, location } = useGeolocation();
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
    // Fetch checklist
    const { data: checklistData } = await supabase
      .from('job_checklist_items')
      .select('*')
      .eq('job_id', jobId)
      .order('sort_order');
    setChecklist(checklistData || []);

    // Fetch photos
    const { data: photosData } = await supabase
      .from('job_photos')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    setPhotos(photosData || []);

    // Fetch notes
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

    // Fetch signature
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

  const handleEnRoute = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'en_route' })
        .eq('id', jobId);

      if (error) throw error;
      toast.success('Status updated to En Route');
      
      // Send notification to customer
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
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'in_progress' })
        .eq('id', jobId);

      if (error) throw error;
      toast.success('Job started');
      fetchMyJobs();
      if (selectedJob?.id === jobId) {
        setSelectedJob(prev => prev ? { ...prev, status: 'in_progress' } : null);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCompleteJob = async (jobId: string) => {
    // Check if signature is required
    if (!signature) {
      toast.error('Please get customer signature before completing');
      setShowSignaturePad(true);
      return;
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', jobId);

      if (error) throw error;
      toast.success('Job completed!');
      
      // Send completion notification to customer
      notifyJobCompleted(jobId);
      
      fetchMyJobs();
      setSelectedJob(null);
    } catch (error: any) {
      toast.error(error.message);
    }
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

  const activeJobs = jobs.filter(j => ['scheduled', 'en_route', 'in_progress'].includes(j.status));
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const pendingJobs = jobs.filter(j => j.status === 'pending');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Jobs</h1>
            <p className="text-muted-foreground">View and manage your assigned jobs</p>
          </div>
          
          {/* Shift Toggle */}
          <Button
            variant={isOnShift ? "default" : "outline"}
            onClick={toggleShift}
            className={cn(
              "gap-2",
              isOnShift && "bg-success hover:bg-success/90"
            )}
          >
            <Power className="w-4 h-4" />
            {isOnShift ? 'On Shift' : 'Start Shift'}
          </Button>
        </div>

        {/* Location Status */}
        {isOnShift && location.latitude && (
          <Card className="bg-success/10 border-success/30">
            <CardContent className="py-3 flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-success" />
              <span className="text-success">Location tracking active</span>
              <span className="text-muted-foreground ml-auto text-xs">
                {location.latitude.toFixed(4)}, {location.longitude?.toFixed(4)}
              </span>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Jobs List */}
          <div className="space-y-4">
            <Tabs defaultValue="active">
              <TabsList>
                <TabsTrigger value="active">Active ({activeJobs.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({pendingJobs.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completedJobs.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-3 mt-4">
                {activeJobs.map((job) => (
                  <JobListItem 
                    key={job.id} 
                    job={job} 
                    isSelected={selectedJob?.id === job.id}
                    onClick={() => handleSelectJob(job)}
                  />
                ))}
                {activeJobs.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">No active jobs</p>
                )}
              </TabsContent>

              <TabsContent value="pending" className="space-y-3 mt-4">
                {pendingJobs.map((job) => (
                  <JobListItem 
                    key={job.id} 
                    job={job} 
                    isSelected={selectedJob?.id === job.id}
                    onClick={() => handleSelectJob(job)}
                  />
                ))}
                {pendingJobs.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">No pending jobs</p>
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-3 mt-4">
                {completedJobs.map((job) => (
                  <JobListItem 
                    key={job.id} 
                    job={job} 
                    isSelected={selectedJob?.id === job.id}
                    onClick={() => handleSelectJob(job)}
                  />
                ))}
                {completedJobs.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">No completed jobs</p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Job Details */}
          <div>
            {selectedJob ? (
              <Card className="sticky top-6">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-xl font-semibold">{selectedJob.title}</h2>
                      {selectedJob.customer && (
                        <p className="text-muted-foreground">{selectedJob.customer.name}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <PriorityBadge priority={selectedJob.priority} />
                      <StatusBadge status={selectedJob.status} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {selectedJob.description && (
                    <div>
                      <h3 className="font-medium mb-2">Description</h3>
                      <p className="text-sm text-muted-foreground">{selectedJob.description}</p>
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    {selectedJob.scheduled_date && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {format(new Date(selectedJob.scheduled_date), 'EEEE, MMMM d, yyyy')}
                          {selectedJob.scheduled_time && ` at ${selectedJob.scheduled_time.slice(0, 5)}`}
                        </span>
                      </div>
                    )}
                    {(selectedJob.address || selectedJob.city) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {[selectedJob.address, selectedJob.city, selectedJob.state]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                    {selectedJob.customer?.phone && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <a 
                          href={`tel:${selectedJob.customer.phone}`}
                          className="hover:text-accent"
                        >
                          {selectedJob.customer.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Photos Section */}
                  <Collapsible open={expandedSections.photos}>
                    <CollapsibleTrigger 
                      className="flex items-center justify-between w-full py-2"
                      onClick={() => toggleSection('photos')}
                    >
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        <h3 className="font-medium">Photos</h3>
                        <span className="text-xs text-muted-foreground">({photos.length})</span>
                      </div>
                      {expandedSections.photos ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      {selectedJob.status !== 'completed' && (
                        <div className="flex gap-2 mb-4">
                          <PhotoUpload 
                            jobId={selectedJob.id} 
                            photoType="before"
                            onUploadComplete={() => fetchJobDetails(selectedJob.id)}
                          />
                          <PhotoUpload 
                            jobId={selectedJob.id} 
                            photoType="during"
                            onUploadComplete={() => fetchJobDetails(selectedJob.id)}
                          />
                          <PhotoUpload 
                            jobId={selectedJob.id} 
                            photoType="after"
                            onUploadComplete={() => fetchJobDetails(selectedJob.id)}
                          />
                        </div>
                      )}
                      <PhotoGallery jobId={selectedJob.id} photos={photos} />
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Notes Section */}
                  <Collapsible open={expandedSections.notes}>
                    <CollapsibleTrigger 
                      className="flex items-center justify-between w-full py-2"
                      onClick={() => toggleSection('notes')}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <h3 className="font-medium">Notes</h3>
                        <span className="text-xs text-muted-foreground">({notes.length})</span>
                      </div>
                      {expandedSections.notes ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <JobNotes 
                        jobId={selectedJob.id} 
                        notes={notes}
                        onNoteAdded={() => fetchJobDetails(selectedJob.id)}
                        readOnly={selectedJob.status === 'completed'}
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Checklist */}
                  {checklist.length > 0 && (
                    <Collapsible open={expandedSections.checklist}>
                      <CollapsibleTrigger 
                        className="flex items-center justify-between w-full py-2"
                        onClick={() => toggleSection('checklist')}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <h3 className="font-medium">Checklist</h3>
                          <span className="text-xs text-muted-foreground">
                            ({checklist.filter(i => i.is_completed).length}/{checklist.length})
                          </span>
                        </div>
                        {expandedSections.checklist ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <div className="space-y-2">
                          {checklist.map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <Checkbox
                                id={item.id}
                                checked={item.is_completed}
                                onCheckedChange={(checked) => 
                                  handleToggleChecklistItem(item.id, checked as boolean)
                                }
                                disabled={selectedJob.status === 'completed'}
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
                  ) : selectedJob.status === 'in_progress' && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setShowSignaturePad(true)}
                    >
                      <Pen className="w-4 h-4" />
                      Get Customer Signature
                    </Button>
                  )}

                  {/* Actions */}
                  {selectedJob.status !== 'completed' && (
                    <div className="flex gap-3 pt-4 border-t">
                      {selectedJob.status === 'scheduled' && (
                        <Button 
                          className="flex-1 gap-2"
                          variant="secondary"
                          onClick={() => handleEnRoute(selectedJob.id)}
                        >
                          <MapPin className="w-4 h-4" />
                          En Route
                        </Button>
                      )}
                      {selectedJob.status === 'en_route' && (
                        <Button 
                          className="flex-1 gap-2"
                          onClick={() => handleStartJob(selectedJob.id)}
                        >
                          <PlayCircle className="w-4 h-4" />
                          Start Job
                        </Button>
                      )}
                      {selectedJob.status === 'in_progress' && (
                        <Button 
                          className="flex-1 gap-2"
                          onClick={() => handleCompleteJob(selectedJob.id)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Complete Job
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Select a job to view details</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Signature Pad Dialog */}
      {selectedJob && (
        <SignaturePad
          jobId={selectedJob.id}
          open={showSignaturePad}
          onOpenChange={setShowSignaturePad}
          onSignatureComplete={() => fetchJobDetails(selectedJob.id)}
        />
      )}
    </AppLayout>
  );
}

function JobListItem({ 
  job, 
  isSelected, 
  onClick 
}: { 
  job: Job; 
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all",
        isSelected ? "ring-2 ring-accent" : "hover:shadow-md"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium truncate">{job.title}</h3>
            {job.customer && (
              <p className="text-sm text-muted-foreground truncate">
                {job.customer.name}
              </p>
            )}
            {job.scheduled_date && (
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(job.scheduled_date), 'MMM d')}
                {job.scheduled_time && ` at ${job.scheduled_time.slice(0, 5)}`}
              </p>
            )}
          </div>
          <StatusBadge status={job.status} />
        </div>
      </CardContent>
    </Card>
  );
}
