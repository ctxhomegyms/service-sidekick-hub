import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Skill {
  id: string;
  name: string;
  color: string | null;
}

interface TechnicianLocation {
  latitude: number;
  longitude: number;
  is_on_shift: boolean;
  updated_at: string;
}

interface JobSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  completed_at: string | null;
  started_at: string | null;
  actual_duration_minutes: number | null;
  estimated_duration_minutes: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  job_number: string | null;
  customer: {
    id: string;
    name: string;
  } | null;
  job_type: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  is_primary: boolean;
}

interface PerformanceMetrics {
  totalCompleted: number;
  totalInProgress: number;
  totalPending: number;
  completionRate: number;
  averageDurationMinutes: number | null;
  totalHoursThisMonth: number;
}

interface TechnicianProfile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export function useTechnicianProfile(technicianId: string | undefined) {
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [location, setLocation] = useState<TechnicianLocation | null>(null);
  const [todaysJobs, setTodaysJobs] = useState<JobSummary[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<JobSummary[]>([]);
  const [jobHistory, setJobHistory] = useState<JobSummary[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!technicianId) {
      setIsLoading(false);
      return;
    }

    fetchTechnicianData();
  }, [technicianId]);

  const fetchTechnicianData = async () => {
    if (!technicianId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', technicianId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch skills
      const { data: techSkills } = await supabase
        .from('technician_skills')
        .select('skill_id')
        .eq('technician_id', technicianId);

      if (techSkills?.length) {
        const skillIds = techSkills.map(ts => ts.skill_id);
        const { data: skillsData } = await supabase
          .from('skills')
          .select('*')
          .in('id', skillIds);
        setSkills(skillsData || []);
      }

      // Fetch location
      const { data: locationData } = await supabase
        .from('technician_locations')
        .select('*')
        .eq('technician_id', technicianId)
        .single();

      if (locationData) {
        setLocation({
          latitude: Number(locationData.latitude),
          longitude: Number(locationData.longitude),
          is_on_shift: locationData.is_on_shift,
          updated_at: locationData.updated_at,
        });
      }

      // Fetch all jobs for this technician
      const { data: directJobs } = await supabase
        .from('jobs')
        .select('*, customer:customers(id, name), job_type:job_types(id, name, color)')
        .eq('assigned_technician_id', technicianId)
        .order('scheduled_date', { ascending: false });

      // Fetch crew assignments
      const { data: crewAssignments } = await supabase
        .from('job_crew')
        .select('job_id, is_primary')
        .eq('technician_id', technicianId);

      const crewJobIds = crewAssignments?.map(c => c.job_id) || [];
      const crewPrimaryMap: Record<string, boolean> = {};
      crewAssignments?.forEach(c => {
        crewPrimaryMap[c.job_id] = c.is_primary;
      });

      let crewJobs: typeof directJobs = [];
      if (crewJobIds.length > 0) {
        const { data } = await supabase
          .from('jobs')
          .select('*, customer:customers(id, name), job_type:job_types(id, name, color)')
          .in('id', crewJobIds)
          .order('scheduled_date', { ascending: false });
        crewJobs = data || [];
      }

      // Combine and deduplicate jobs
      const allJobsMap = new Map<string, JobSummary>();
      
      directJobs?.forEach(job => {
        allJobsMap.set(job.id, {
          id: job.id,
          title: job.title,
          status: job.status,
          priority: job.priority,
          scheduled_date: job.scheduled_date,
          scheduled_time: job.scheduled_time,
          completed_at: job.completed_at,
          started_at: job.started_at,
          actual_duration_minutes: job.actual_duration_minutes,
          estimated_duration_minutes: job.estimated_duration_minutes,
          address: job.address,
          city: job.city,
          state: job.state,
          job_number: job.job_number,
          customer: job.customer,
          job_type: job.job_type,
          is_primary: true,
        });
      });

      crewJobs?.forEach(job => {
        if (!allJobsMap.has(job.id)) {
          allJobsMap.set(job.id, {
            id: job.id,
            title: job.title,
            status: job.status,
            priority: job.priority,
            scheduled_date: job.scheduled_date,
            scheduled_time: job.scheduled_time,
            completed_at: job.completed_at,
            started_at: job.started_at,
            actual_duration_minutes: job.actual_duration_minutes,
            estimated_duration_minutes: job.estimated_duration_minutes,
            address: job.address,
            city: job.city,
            state: job.state,
            job_number: job.job_number,
            customer: job.customer,
            job_type: job.job_type,
            is_primary: crewPrimaryMap[job.id] || false,
          });
        }
      });

      const allJobs = Array.from(allJobsMap.values());

      // Categorize jobs
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      const todaysList = allJobs.filter(
        job => job.scheduled_date === today && job.status !== 'cancelled' && job.status !== 'completed'
      );

      const upcomingList = allJobs.filter(
        job => job.scheduled_date && job.scheduled_date > today && job.scheduled_date <= nextWeekStr && 
               job.status !== 'cancelled' && job.status !== 'completed'
      );

      const historyList = allJobs.filter(
        job => job.status === 'completed' || (job.scheduled_date && job.scheduled_date < today)
      );

      setTodaysJobs(todaysList.sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || '')));
      setUpcomingJobs(upcomingList.sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || '')));
      setJobHistory(historyList.slice(0, 50)); // Limit history

      // Calculate metrics
      const completed = allJobs.filter(j => j.status === 'completed');
      const inProgress = allJobs.filter(j => j.status === 'in_progress');
      const pending = allJobs.filter(j => j.status === 'pending' || j.status === 'scheduled');
      const nonCancelled = allJobs.filter(j => j.status !== 'cancelled');

      const completedDurations = completed
        .filter(j => j.actual_duration_minutes)
        .map(j => j.actual_duration_minutes as number);

      const avgDuration = completedDurations.length > 0
        ? completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length
        : null;

      // Hours this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const monthlyMinutes = completed
        .filter(j => j.completed_at && new Date(j.completed_at) >= startOfMonth)
        .reduce((sum, j) => sum + (j.actual_duration_minutes || 0), 0);

      setMetrics({
        totalCompleted: completed.length,
        totalInProgress: inProgress.length,
        totalPending: pending.length,
        completionRate: nonCancelled.length > 0 ? (completed.length / nonCancelled.length) * 100 : 0,
        averageDurationMinutes: avgDuration,
        totalHoursThisMonth: Math.round(monthlyMinutes / 60 * 10) / 10,
      });

    } catch (err) {
      console.error('Error fetching technician data:', err);
      setError('Failed to load technician data');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    profile,
    skills,
    location,
    todaysJobs,
    upcomingJobs,
    jobHistory,
    metrics,
    isLoading,
    error,
    refetch: fetchTechnicianData,
  };
}
