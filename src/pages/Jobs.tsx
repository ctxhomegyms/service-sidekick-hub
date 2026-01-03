import { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { JobCard } from '@/components/jobs/JobCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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
  customer: { name: string } | null;
  technician: { full_name: string | null; avatar_url: string | null } | null;
}

interface Customer {
  id: string;
  name: string;
}

interface Technician {
  id: string;
  full_name: string | null;
}

export default function Jobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newJob, setNewJob] = useState<{
    title: string;
    description: string;
    customer_id: string;
    assigned_technician_id: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    scheduled_date: string;
    scheduled_time: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
  }>({
    title: '',
    description: '',
    customer_id: '',
    assigned_technician_id: '',
    priority: 'medium',
    scheduled_date: '',
    scheduled_time: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, customersRes, techniciansRes] = await Promise.all([
        supabase
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
          .order('created_at', { ascending: false }),
        supabase.from('customers').select('id, name').order('name'),
        supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', (await supabase.from('user_roles').select('user_id').eq('role', 'technician')).data?.map(r => r.user_id) || [])
      ]);

      if (jobsRes.data) setJobs(jobsRes.data as unknown as Job[]);
      if (customersRes.data) setCustomers(customersRes.data);
      if (techniciansRes.data) setTechnicians(techniciansRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newJob.title.trim()) {
      toast.error('Please enter a job title');
      return;
    }

    try {
      const { error } = await supabase.from('jobs').insert({
        title: newJob.title,
        description: newJob.description || null,
        customer_id: newJob.customer_id || null,
        assigned_technician_id: newJob.assigned_technician_id || null,
        priority: newJob.priority,
        scheduled_date: newJob.scheduled_date || null,
        scheduled_time: newJob.scheduled_time || null,
        address: newJob.address || null,
        city: newJob.city || null,
        state: newJob.state || null,
        zip_code: newJob.zip_code || null,
        created_by: user?.id,
        status: newJob.scheduled_date ? 'scheduled' : 'pending',
      });

      if (error) throw error;

      toast.success('Job created successfully');
      setIsDialogOpen(false);
      setNewJob({
        title: '',
        description: '',
        customer_id: '',
        assigned_technician_id: '',
        priority: 'medium',
        scheduled_date: '',
        scheduled_time: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create job');
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customer?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
            <p className="text-muted-foreground">Manage and track all service jobs</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Job
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Job</DialogTitle>
                <DialogDescription>
                  Add a new service job to the system
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateJob} className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title *</Label>
                    <Input
                      id="title"
                      value={newJob.title}
                      onChange={(e) => setNewJob(j => ({ ...j, title: e.target.value }))}
                      placeholder="e.g., AC Repair, Plumbing Fix"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newJob.description}
                      onChange={(e) => setNewJob(j => ({ ...j, description: e.target.value }))}
                      placeholder="Job details..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer">Customer</Label>
                      <Select
                        value={newJob.customer_id}
                        onValueChange={(value) => setNewJob(j => ({ ...j, customer_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="technician">Assign Technician</Label>
                      <Select
                        value={newJob.assigned_technician_id}
                        onValueChange={(value) => setNewJob(j => ({ ...j, assigned_technician_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select technician" />
                        </SelectTrigger>
                        <SelectContent>
                          {technicians.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.full_name || 'Unknown'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={newJob.priority}
                        onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                          setNewJob(j => ({ ...j, priority: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date">Scheduled Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newJob.scheduled_date}
                        onChange={(e) => setNewJob(j => ({ ...j, scheduled_date: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={newJob.scheduled_time}
                        onChange={(e) => setNewJob(j => ({ ...j, scheduled_time: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={newJob.address}
                      onChange={(e) => setNewJob(j => ({ ...j, address: e.target.value }))}
                      placeholder="Street address"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={newJob.city}
                        onChange={(e) => setNewJob(j => ({ ...j, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={newJob.state}
                        onChange={(e) => setNewJob(j => ({ ...j, state: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input
                        id="zip"
                        value={newJob.zip_code}
                        onChange={(e) => setNewJob(j => ({ ...j, zip_code: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Job</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs or customers..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="en_route">En Route</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Jobs Grid */}
        {filteredJobs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all' 
                ? 'No jobs match your filters' 
                : 'No jobs yet. Create your first job!'}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
