import { useParams, useNavigate, Link } from 'react-router-dom';
import { Database } from '@/integrations/supabase/types';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Timer,
  TrendingUp,
  Briefcase,
  User,
  ExternalLink,
  Star,
  Hash
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { useTechnicianProfile } from '@/hooks/useTechnicianProfile';

type JobStatus = Database['public']['Enums']['job_status'];

const priorityConfig: Record<string, { label: string; class: string }> = {
  low: { label: 'Low', class: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', class: 'bg-accent text-accent-foreground' },
  high: { label: 'High', class: 'bg-warning/20 text-warning' },
  urgent: { label: 'Urgent', class: 'bg-destructive/20 text-destructive' },
};

export default function TechnicianDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    profile, 
    skills, 
    location, 
    todaysJobs, 
    upcomingJobs, 
    jobHistory, 
    metrics, 
    isLoading, 
    error 
  } = useTechnicianProfile(id);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !profile) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold">Technician Not Found</h2>
          <p className="text-muted-foreground mb-4">
            {error || 'The technician you are looking for does not exist.'}
          </p>
          <Button onClick={() => navigate('/technicians')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Technicians
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/technicians')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-xl bg-accent text-accent-foreground">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                {location?.is_on_shift && (
                  <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{profile.full_name || 'Unknown'}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary">Technician</Badge>
                  {location?.is_on_shift ? (
                    <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">
                      On Shift
                    </Badge>
                  ) : (
                    <Badge variant="outline">Off Shift</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Location */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${profile.email}`} className="hover:text-primary">
                  {profile.email}
                </a>
              </div>
              {profile.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${profile.phone}`} className="hover:text-primary">
                    {profile.phone}
                  </a>
                </div>
              )}
              {location && location.is_on_shift && (
                <div className="flex items-center gap-2 text-sm pt-2 border-t">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Last update: {formatDistanceToNow(new Date(location.updated_at), { addSuffix: true })}
                  </span>
                  <Link to="/map" className="text-primary hover:underline ml-auto text-xs">
                    View on Map
                  </Link>
                </div>
              )}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                <User className="w-3 h-3 inline mr-1" />
                Member since {format(new Date(profile.created_at), 'MMM d, yyyy')}
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Skills & Certifications</CardTitle>
            </CardHeader>
            <CardContent>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map(skill => (
                    <Badge
                      key={skill.id}
                      style={{ 
                        backgroundColor: `${skill.color}20`, 
                        color: skill.color || undefined,
                        borderColor: skill.color || undefined
                      }}
                      variant="outline"
                    >
                      {skill.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No skills assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Completed</p>
                    <p className="text-xl font-semibold text-green-600">{metrics.totalCompleted}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">In Progress</p>
                    <p className="text-xl font-semibold text-blue-600">{metrics.totalInProgress}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Completion Rate</p>
                    <p className="text-xl font-semibold">{Math.round(metrics.completionRate)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Duration</p>
                    <p className="text-xl font-semibold">{formatDuration(metrics.averageDurationMinutes)}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t">
                    <p className="text-muted-foreground">Hours This Month</p>
                    <p className="text-xl font-semibold">{metrics.totalHoursThisMonth}h</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Today's Schedule
              {todaysJobs.length > 0 && (
                <Badge variant="secondary" className="ml-2">{todaysJobs.length} jobs</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysJobs.length > 0 ? (
              <div className="space-y-3">
                {todaysJobs.map(job => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="text-sm font-medium w-16">
                      {job.scheduled_time ? format(new Date(`2000-01-01T${job.scheduled_time}`), 'h:mm a') : '-'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{job.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {job.customer?.name || 'No customer'}
                      </p>
                    </div>
                    {job.job_type && (
                      <Badge
                        variant="outline"
                        style={{ 
                          backgroundColor: `${job.job_type.color}20`, 
                          color: job.job_type.color || undefined,
                          borderColor: job.job_type.color || undefined
                        }}
                      >
                        {job.job_type.name}
                      </Badge>
                    )}
                    <StatusBadge status={job.status as JobStatus} />
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No jobs scheduled for today
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Jobs */}
        {upcomingJobs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Upcoming Jobs (Next 7 Days)
                <Badge variant="secondary" className="ml-2">{upcomingJobs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingJobs.slice(0, 5).map(job => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="text-sm w-20">
                      {job.scheduled_date && format(new Date(job.scheduled_date), 'MMM d')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{job.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {job.customer?.name || 'No customer'}
                      </p>
                    </div>
                    <Badge className={priorityConfig[job.priority]?.class || ''}>
                      {priorityConfig[job.priority]?.label || job.priority}
                    </Badge>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Job History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Job History
              <Badge variant="secondary" className="ml-2">{jobHistory.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobHistory.length > 0 ? (
              <div className="space-y-3">
                {jobHistory.slice(0, 20).map(job => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="text-sm text-muted-foreground w-20">
                      {job.completed_at 
                        ? format(new Date(job.completed_at), 'MMM d')
                        : job.scheduled_date 
                          ? format(new Date(job.scheduled_date), 'MMM d')
                          : '-'
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {job.job_number && (
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Hash className="w-3 h-3" />{job.job_number}
                          </span>
                        )}
                        <p className="font-medium truncate">{job.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {job.customer?.name || 'No customer'}
                        {job.city && ` • ${job.city}`}
                      </p>
                    </div>
                    {job.is_primary && (
                      <Star className="w-4 h-4 text-yellow-500" />
                    )}
                    {job.actual_duration_minutes && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Timer className="w-3 h-3" />
                        {formatDuration(job.actual_duration_minutes)}
                      </div>
                    )}
                    <StatusBadge status={job.status as JobStatus} />
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No job history yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
