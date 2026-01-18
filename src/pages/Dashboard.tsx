import { useEffect, useState } from 'react';
import { Briefcase, Users, Clock, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/stats/StatCard';
import { JobCard } from '@/components/jobs/JobCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { TodaysScheduleWidget } from '@/components/dashboard/TodaysScheduleWidget';

interface JobStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  urgent: number;
}

interface Job {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduled_date: string | null;
  scheduled_time: string | null;
  address: string | null;
  city: string | null;
  customer: { name: string } | null;
  technician: { full_name: string | null; avatar_url: string | null } | null;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<JobStats>({ total: 0, pending: 0, inProgress: 0, completed: 0, urgent: 0 });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [technicianCount, setTechnicianCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch job stats
      const { data: jobs } = await supabase
        .from('jobs')
        .select('status, priority');

      if (jobs) {
        setStats({
          total: jobs.length,
          pending: jobs.filter(j => j.status === 'pending').length,
          inProgress: jobs.filter(j => j.status === 'in_progress').length,
          completed: jobs.filter(j => j.status === 'completed').length,
          urgent: jobs.filter(j => j.priority === 'urgent').length,
        });
      }

      // Fetch recent jobs with customer and technician info
      const { data: recentJobsData } = await supabase
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
          customer:customers(name),
          technician:profiles!jobs_assigned_technician_id_fkey(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(6);

      if (recentJobsData) {
        setRecentJobs(recentJobsData as unknown as Job[]);
      }

      // Fetch technician count
      const { count } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'technician');

      setTechnicianCount(count || 0);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your field operations today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            title="Total Jobs"
            value={stats.total}
            subtitle="All time"
            icon={<Briefcase className="w-5 h-5" />}
          />
          <StatCard
            title="In Progress"
            value={stats.inProgress}
            subtitle="Active jobs"
            icon={<Clock className="w-5 h-5" />}
          />
          <StatCard
            title="Completed"
            value={stats.completed}
            subtitle="This month"
            icon={<CheckCircle2 className="w-5 h-5" />}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Technicians"
            value={technicianCount}
            subtitle="Active team members"
            icon={<Users className="w-5 h-5" />}
          />
        </div>

        {/* Today's Schedule + Quick Stats Row */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Today's Schedule Widget - Takes 2 columns */}
          <div className="lg:col-span-2">
            <TodaysScheduleWidget />
          </div>

          {/* Quick Stats Column */}
          <div className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Requires Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{stats.pending + stats.urgent}</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.pending} pending, {stats.urgent} urgent
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  Completion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">
                      {stats.total > 0 
                        ? Math.round((stats.completed / stats.total) * 100) 
                        : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stats.completed} of {stats.total} jobs completed
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Jobs</h2>
          </div>
          
          {recentJobs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No jobs yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first job to get started
              </p>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
