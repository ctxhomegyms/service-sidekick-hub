import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { JobHeader } from '@/components/jobs/JobHeader';
import { ServiceDetailsCard } from '@/components/jobs/ServiceDetailsCard';
import { InstructionsCard } from '@/components/jobs/InstructionsCard';
import { AppointmentsSection } from '@/components/jobs/AppointmentsSection';
import { JobChecklistDisplay } from '@/components/jobs/JobChecklistDisplay';
import { JobNotes } from '@/components/jobs/JobNotes';
import { PhotoUpload } from '@/components/jobs/PhotoUpload';
import { JobActivities } from '@/components/jobs/JobActivities';

interface JobData {
  id: string;
  job_number: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  status: string;
  priority: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  end_date: string | null;
  end_time: string | null;
  estimated_duration_minutes: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  completed_at: string | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
  } | null;
  job_type: { id: string; name: string; color: string | null } | null;
  created_by: string | null;
  assigned_technician: { id: string; full_name: string | null; avatar_url: string | null } | null;
  tags: Array<{ tag: { id: string; name: string; color: string | null } }>;
  line_items: Array<{ id: string; description: string; quantity: number; unit_price: number | null; sort_order: number }>;
  notes: Array<{ id: string; note_text: string; created_at: string; author: { full_name: string | null } | null }>;
  photos: Array<{ id: string; photo_url: string; photo_type: string; caption: string | null; created_at: string }>;
  checklist_items: Array<{
    id: string;
    item_text: string;
    item_type: string;
    is_required: boolean;
    is_completed: boolean;
    completed_at: string | null;
    completed_by: string | null;
    sort_order: number;
    image_url: string | null;
    signature_url: string | null;
    response_text: string | null;
    response_value: unknown;
    options: unknown;
  }>;
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (id) {
      fetchJob();
    }
  }, [id]);

  const fetchJob = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*),
          job_type:job_types(*),
          assigned_technician:profiles!jobs_assigned_technician_id_fkey(id, full_name, avatar_url),
          tags:job_tags(tag:tags(*)),
          line_items:job_line_items(*),
          notes:job_notes(*, author:profiles!job_notes_author_id_fkey(full_name)),
          photos:job_photos(*),
          checklist_items:job_checklist_items(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setJob(data as unknown as JobData);
      }
    } catch (error) {
      console.error('Error fetching job:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobUpdate = () => {
    fetchJob();
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Job not found</p>
          <Button variant="link" onClick={() => navigate('/jobs')}>
            Back to Jobs
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" className="gap-2" onClick={() => navigate('/jobs')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </Button>

        {/* Job Header */}
        <JobHeader job={job} onUpdate={handleJobUpdate} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Job Details</TabsTrigger>
            <TabsTrigger value="notes">Notes & Attachments</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <ServiceDetailsCard job={job} onUpdate={handleJobUpdate} />
              <InstructionsCard job={job} onUpdate={handleJobUpdate} />
            </div>
            
            <AppointmentsSection job={job} onUpdate={handleJobUpdate} />
            
            {job.line_items.length > 0 && (
              <div className="rounded-lg border bg-card p-6">
                <h3 className="font-semibold mb-4">Line Items</h3>
                <div className="space-y-2">
                  {job.line_items.sort((a, b) => a.sort_order - b.sort_order).map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span>{item.description}</span>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Qty: {item.quantity}</span>
                        {item.unit_price && <span>${item.unit_price.toFixed(2)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {job.checklist_items.length > 0 && (
              <JobChecklistDisplay 
                jobId={job.id} 
                items={job.checklist_items} 
                onUpdate={handleJobUpdate}
                jobInfo={{
                  title: job.title,
                  job_number: job.job_number,
                  customer_name: job.customer?.name || null,
                  address: job.address ? `${job.address}${job.city ? `, ${job.city}` : ''}${job.state ? `, ${job.state}` : ''} ${job.zip_code || ''}`.trim() : null,
                  scheduled_date: job.scheduled_date,
                  completed_at: job.completed_at,
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-6 mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg border bg-card p-6">
                <h3 className="font-semibold mb-4">Notes</h3>
                <JobNotes 
                  jobId={job.id} 
                  notes={job.notes.map(n => ({
                    id: n.id,
                    note_text: n.note_text,
                    created_at: n.created_at,
                    author: n.author
                  }))}
                  onNoteAdded={handleJobUpdate}
                />
              </div>
              
              <div className="rounded-lg border bg-card p-6">
                <h3 className="font-semibold mb-4">Photos & Attachments</h3>
                <div className="flex gap-2 mb-4">
                  <PhotoUpload jobId={job.id} photoType="before" onUploadComplete={handleJobUpdate} />
                  <PhotoUpload jobId={job.id} photoType="during" onUploadComplete={handleJobUpdate} />
                  <PhotoUpload jobId={job.id} photoType="after" onUploadComplete={handleJobUpdate} />
                </div>
                
                {job.photos.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {job.photos.map((photo) => (
                      <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden">
                        <img 
                          src={photo.photo_url} 
                          alt={photo.caption || 'Job photo'} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                          {photo.photo_type}{photo.caption ? `: ${photo.caption}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activities" className="mt-6">
            <JobActivities jobId={job.id} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
