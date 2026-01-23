import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  User,
  FileText,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PenLine,
  ExternalLink,
  Timer,
  Briefcase,
  Hash,
  ClipboardList,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useCustomerHistory } from '@/hooks/useCustomerHistory';
import { StatusBadge } from '@/components/StatusBadge';
import { NotificationPreferences } from '@/components/customers/NotificationPreferences';
import { NotificationHistory } from '@/components/customers/NotificationHistory';
import type { Database } from '@/integrations/supabase/types';

type JobStatus = Database['public']['Enums']['job_status'];

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getPriorityVariant(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'destructive';
    case 'high':
      return 'default';
    case 'medium':
      return 'secondary';
    default:
      return 'outline';
  }
}

export default function CustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { customer, jobs, isLoading, error } = useCustomerHistory(customerId);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error || !customer) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-muted-foreground">{error || 'Customer not found'}</p>
          <Button onClick={() => navigate('/customers')}>Back to Customers</Button>
        </div>
      </AppLayout>
    );
  }

  const completedJobs = jobs.filter((j) => j.status === 'completed').length;
  const totalPhotos = jobs.reduce((sum, j) => sum + j.photos.length, 0);
  const totalNotes = jobs.reduce((sum, j) => sum + j.notes.length, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
            <p className="text-muted-foreground">
              Customer since {format(new Date(customer.created_at), 'MMMM yyyy')}
            </p>
          </div>
        </div>

        {/* Customer Info Card */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${customer.email}`} className="text-sm hover:underline">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${customer.phone}`} className="text-sm hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}
              {(customer.address || customer.city) && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    {customer.address && <p>{customer.address}</p>}
                    <p>
                      {[customer.city, customer.state, customer.zip_code]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              )}
              {customer.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{customer.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="lg:col-span-2 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completedJobs}</p>
                    <p className="text-xs text-muted-foreground">Completed Jobs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalPhotos}</p>
                    <p className="text-xs text-muted-foreground">Total Photos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalNotes}</p>
                    <p className="text-xs text-muted-foreground">Work Notes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <NotificationPreferences customerId={customer.id} />
          <NotificationHistory customerId={customer.id} />
        </div>

        {/* Job History */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Service History</h2>
          {jobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No service history for this customer yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <Card key={job.id} className="overflow-hidden">
                  {/* Job Header - Clickable */}
                  <Link to={`/jobs/${job.id}`} className="block hover:bg-muted/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {job.job_number && (
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {job.job_number}
                              </span>
                            )}
                            {job.job_type && (
                              <Badge 
                                variant="outline" 
                                style={{ 
                                  borderColor: job.job_type.color || undefined,
                                  color: job.job_type.color || undefined 
                                }}
                              >
                                {job.job_type.name}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg mt-2 flex items-center gap-2">
                            {job.title}
                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          </CardTitle>
                          {job.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {job.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={getPriorityVariant(job.priority)} className="capitalize">
                            {job.priority}
                          </Badge>
                          <StatusBadge status={job.status as JobStatus} />
                        </div>
                      </div>
                    </CardHeader>
                  </Link>

                  <CardContent className="pt-0 space-y-4">
                    {/* Key Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-muted/30 rounded-lg">
                      {job.scheduled_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Scheduled</p>
                            <p className="text-sm font-medium">
                              {format(new Date(job.scheduled_date), 'MMM d, yyyy')}
                              {job.scheduled_time && (
                                <span className="text-muted-foreground ml-1">
                                  {job.scheduled_time.slice(0, 5)}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {(job.estimated_duration_minutes || job.actual_duration_minutes) && (
                        <div className="flex items-center gap-2">
                          <Timer className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="text-sm font-medium">
                              {job.actual_duration_minutes 
                                ? `${job.actual_duration_minutes} min (actual)`
                                : `${job.estimated_duration_minutes} min (est.)`
                              }
                            </p>
                          </div>
                        </div>
                      )}

                      {job.technician && (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={job.technician.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(job.technician.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs text-muted-foreground">Technician</p>
                            <p className="text-sm font-medium truncate">
                              {job.technician.full_name || 'Unknown'}
                            </p>
                          </div>
                        </div>
                      )}

                      {(job.address || job.city) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Location</p>
                            <p className="text-sm font-medium truncate">
                              {job.city || job.address}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Instructions */}
                    {job.instructions && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center gap-1 mb-1">
                          <ClipboardList className="w-3 h-3" />
                          Instructions
                        </p>
                        <p className="text-sm text-blue-900 dark:text-blue-100">{job.instructions}</p>
                      </div>
                    )}

                    {/* Completion Notes */}
                    {job.completion_notes && (
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1 mb-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Completion Notes
                        </p>
                        <p className="text-sm text-green-900 dark:text-green-100">{job.completion_notes}</p>
                      </div>
                    )}

                    {/* Expandable Details */}
                    {(job.photos.length > 0 || job.notes.length > 0 || job.signature) && (
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="details" className="border-0">
                          <AccordionTrigger className="hover:no-underline py-2 text-sm">
                            <div className="flex items-center gap-4 text-muted-foreground">
                              {job.photos.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Camera className="w-4 h-4" />
                                  {job.photos.length} photos
                                </span>
                              )}
                              {job.notes.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <FileText className="w-4 h-4" />
                                  {job.notes.length} notes
                                </span>
                              )}
                              {job.signature && (
                                <span className="flex items-center gap-1">
                                  <PenLine className="w-4 h-4" />
                                  Signed
                                </span>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-3 space-y-4">
                            {/* Photos */}
                            {job.photos.length > 0 && (
                              <div>
                                <p className="text-sm font-medium flex items-center gap-2 mb-3">
                                  <Camera className="w-4 h-4" />
                                  Photos ({job.photos.length})
                                </p>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                  {job.photos.map((photo) => (
                                    <div key={photo.id} className="relative group">
                                      <img
                                        src={photo.photo_url}
                                        alt={photo.caption || photo.photo_type}
                                        className="w-full aspect-square object-cover rounded-lg"
                                      />
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                        <span className="text-xs text-white capitalize">
                                          {photo.photo_type}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {job.notes.length > 0 && (
                              <div>
                                <p className="text-sm font-medium flex items-center gap-2 mb-3">
                                  <FileText className="w-4 h-4" />
                                  Work Notes ({job.notes.length})
                                </p>
                                <div className="space-y-2">
                                  {job.notes.map((note) => (
                                    <div
                                      key={note.id}
                                      className="bg-muted/50 rounded-lg p-3 text-sm"
                                    >
                                      <p>{note.note_text}</p>
                                      <p className="text-xs text-muted-foreground mt-2">
                                        {note.author?.full_name || 'Unknown'} •{' '}
                                        {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Signature */}
                            {job.signature && (
                              <div>
                                <p className="text-sm font-medium flex items-center gap-2 mb-3">
                                  <PenLine className="w-4 h-4" />
                                  Customer Signature
                                </p>
                                <div className="bg-white rounded-lg p-4 inline-block border">
                                  <img
                                    src={job.signature.signature_url}
                                    alt="Customer signature"
                                    className="max-h-20"
                                  />
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Signed by {job.signature.signer_name} •{' '}
                                    {format(new Date(job.signature.signed_at), 'MMM d, yyyy h:mm a')}
                                  </p>
                                </div>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}

                    {/* Completed Info */}
                    {job.completed_at && (
                      <div className="flex items-center gap-2 text-sm text-green-600 pt-2 border-t">
                        <CheckCircle2 className="w-4 h-4" />
                        Completed on {format(new Date(job.completed_at), 'MMMM d, yyyy')}
                        {job.started_at && (
                          <span className="text-muted-foreground ml-2">
                            • Started at {format(new Date(job.started_at), 'h:mm a')}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
