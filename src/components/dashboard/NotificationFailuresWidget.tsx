import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationFailure {
  id: string;
  notification_type: string;
  channel: string;
  recipient: string;
  error_message: string | null;
  created_at: string;
}

interface FailureStats {
  total24h: number;
  failed24h: number;
  failures: NotificationFailure[];
}

export function NotificationFailuresWidget() {
  const [stats, setStats] = useState<FailureStats>({
    total24h: 0,
    failed24h: 0,
    failures: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFailureStats();
  }, []);

  const fetchFailureStats = async () => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Get all notifications in last 24h
      const { data: notifications, error } = await supabase
        .from('notification_log')
        .select('id, notification_type, channel, recipient, status, error_message, created_at')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const total24h = notifications?.length || 0;
      const failures = notifications?.filter(n => n.status === 'failed') || [];
      const failed24h = failures.length;

      setStats({
        total24h,
        failed24h,
        failures: failures.slice(0, 5) as NotificationFailure[],
      });
    } catch (error) {
      console.error('Error fetching notification failures:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const successRate = stats.total24h > 0 
    ? Math.round(((stats.total24h - stats.failed24h) / stats.total24h) * 100) 
    : 100;

  const hasFailures = stats.failed24h > 0;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-5 bg-muted rounded w-32"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted rounded w-16 mb-2"></div>
          <div className="h-4 bg-muted rounded w-24"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={hasFailures ? 'border-destructive/50' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
            {hasFailures && (
              <Badge variant="destructive">
                {stats.failed24h} Failed
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={fetchFailureStats}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">{successRate}%</p>
            <p className="text-sm text-muted-foreground">
              Success rate (24h)
            </p>
          </div>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            hasFailures ? 'bg-destructive/10' : 'bg-success/10'
          }`}>
            {hasFailures ? (
              <AlertTriangle className="w-7 h-7 text-destructive" />
            ) : (
              <CheckCircle2 className="w-7 h-7 text-success" />
            )}
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <div>
            <span className="font-medium">{stats.total24h}</span>{' '}
            <span className="text-muted-foreground">sent</span>
          </div>
          {hasFailures && (
            <div className="text-destructive">
              <span className="font-medium">{stats.failed24h}</span> failed
            </div>
          )}
        </div>

        {hasFailures && stats.failures.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Recent Failures</p>
            <div className="space-y-1">
              {stats.failures.slice(0, 3).map((failure) => (
                <div 
                  key={failure.id} 
                  className="flex items-center justify-between text-xs p-2 rounded bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {failure.channel.toUpperCase()}
                    </Badge>
                    <span className="truncate max-w-[120px]">{failure.recipient}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(failure.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.total24h === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No notifications sent in the last 24 hours
          </p>
        )}
      </CardContent>
    </Card>
  );
}
