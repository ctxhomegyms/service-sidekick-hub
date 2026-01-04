import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Mail, MessageSquare, CheckCircle2, XCircle, Loader2, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NotificationHistoryProps {
  customerId: string;
}

interface NotificationLog {
  id: string;
  job_id: string;
  notification_type: string;
  channel: string;
  recipient: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  job?: {
    title: string;
    job_number: string | null;
  };
}

const notificationTypeLabels: Record<string, string> = {
  job_scheduled: 'Job Scheduled',
  technician_en_route: 'Technician En Route',
  job_completed: 'Job Completed',
};

export function NotificationHistory({ customerId }: NotificationHistoryProps) {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [customerId]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_log')
        .select(`
          *,
          job:jobs(title, job_number)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notification history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification History
        </CardTitle>
        <CardDescription>Recent emails and SMS messages sent to this customer</CardDescription>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No notifications have been sent to this customer yet.
          </p>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                {/* Channel Icon */}
                <div className={`p-2 rounded-full shrink-0 ${
                  notification.channel === 'email' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-green-100 text-green-600'
                }`}>
                  {notification.channel === 'email' ? (
                    <Mail className="w-4 h-4" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {notificationTypeLabels[notification.notification_type] || notification.notification_type}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {notification.channel}
                    </Badge>
                    {notification.status === 'sent' ? (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Sent
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        <XCircle className="w-3 h-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    To: {notification.recipient}
                  </p>
                  
                  {notification.job && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Job: {notification.job.job_number || 'N/A'} - {notification.job.title}
                    </p>
                  )}

                  {notification.error_message && (
                    <p className="text-xs text-destructive mt-1">
                      Error: {notification.error_message}
                    </p>
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-xs text-muted-foreground shrink-0">
                  {notification.sent_at 
                    ? format(new Date(notification.sent_at), 'MMM d, h:mm a')
                    : format(new Date(notification.created_at), 'MMM d, h:mm a')
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
