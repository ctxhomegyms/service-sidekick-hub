import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Activity, 
  Plus, 
  RefreshCw, 
  User, 
  MessageSquare, 
  Camera,
  CheckCircle,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface JobActivity {
  id: string;
  activity_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface JobActivitiesProps {
  jobId: string;
}

const activityIcons: Record<string, typeof Activity> = {
  created: Plus,
  status_changed: RefreshCw,
  assigned: User,
  note_added: MessageSquare,
  photo_uploaded: Camera,
  completed: CheckCircle,
  default: Activity,
};

const activityColors: Record<string, string> = {
  created: 'bg-green-100 text-green-600',
  status_changed: 'bg-blue-100 text-blue-600',
  assigned: 'bg-purple-100 text-purple-600',
  note_added: 'bg-yellow-100 text-yellow-600',
  photo_uploaded: 'bg-pink-100 text-pink-600',
  completed: 'bg-emerald-100 text-emerald-600',
  default: 'bg-gray-100 text-gray-600',
};

export function JobActivities({ jobId }: JobActivitiesProps) {
  const [activities, setActivities] = useState<JobActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivities();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`job-activities-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_activities',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('job_activities')
        .select(`
          id,
          activity_type,
          description,
          metadata,
          created_at,
          user:profiles(full_name, avatar_url)
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data as unknown as JobActivity[]);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">No activity yet</h3>
          <p className="text-sm text-muted-foreground">
            Activity will appear here as changes are made to this job.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="font-semibold mb-6">Activity Timeline</h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-6">
          {activities.map((activity) => {
            const IconComponent = activityIcons[activity.activity_type] || activityIcons.default;
            const colorClass = activityColors[activity.activity_type] || activityColors.default;

            return (
              <div key={activity.id} className="relative flex items-start gap-4 pl-2">
                {/* Icon */}
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${colorClass}`}>
                  <IconComponent className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {activity.user && (
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={activity.user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(activity.user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span className="text-sm font-medium">
                      {activity.user?.full_name || 'System'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
