import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, User, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AppointmentsSectionProps {
  job: {
    id: string;
    job_number: string | null;
    status: string;
    scheduled_date: string | null;
    scheduled_time: string | null;
    end_date: string | null;
    end_time: string | null;
    estimated_duration_minutes: number | null;
    assigned_technician: { id: string; full_name: string | null; avatar_url: string | null } | null;
  };
  onUpdate: () => void;
}

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'en_route', label: 'En Route' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function AppointmentsSection({ job, onUpdate }: AppointmentsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [technicians, setTechnicians] = useState<Array<{ id: string; full_name: string | null; avatar_url: string | null }>>([]);
  const [formData, setFormData] = useState({
    status: job.status,
    scheduled_date: job.scheduled_date || '',
    scheduled_time: job.scheduled_time || '',
    end_date: job.end_date || '',
    end_time: job.end_time || '',
    estimated_duration_minutes: job.estimated_duration_minutes?.toString() || '60',
    assigned_technician_id: job.assigned_technician?.id || '',
  });

  const fetchTechnicians = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .order('full_name');
    if (data) setTechnicians(data);
  };

  const handleEdit = () => {
    fetchTechnicians();
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: formData.status as any,
          scheduled_date: formData.scheduled_date || null,
          scheduled_time: formData.scheduled_time || null,
          end_date: formData.end_date || null,
          end_time: formData.end_time || null,
          estimated_duration_minutes: parseInt(formData.estimated_duration_minutes) || 60,
          assigned_technician_id: formData.assigned_technician_id || null,
        })
        .eq('id', job.id);

      if (error) throw error;

      toast.success('Appointment updated');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      status: job.status,
      scheduled_date: job.scheduled_date || '',
      scheduled_time: job.scheduled_time || '',
      end_date: job.end_date || '',
      end_time: job.end_time || '',
      estimated_duration_minutes: job.estimated_duration_minutes?.toString() || '60',
      assigned_technician_id: job.assigned_technician?.id || '',
    });
    setIsEditing(false);
  };

  const formatDateTime = (date: string | null, time: string | null) => {
    if (!date) return 'Not scheduled';
    const dateStr = format(new Date(date), 'dd MMM');
    const timeStr = time ? `, ${time.slice(0, 5)}` : '';
    return `${dateStr}${timeStr}`;
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'Not set';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return hours === 1 ? 'an hour' : `${hours} hours`;
    return `${hours}h ${mins}m`;
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Scheduled Appointment</h3>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
              <X className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Check className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={handleEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <Label>Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              value={formData.estimated_duration_minutes}
              onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration_minutes: e.target.value }))}
            />
          </div>

          <div>
            <Label>Assigned Technician</Label>
            <Select 
              value={formData.assigned_technician_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_technician_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.full_name || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{job.job_number || 'No job number'}</span>
              <StatusBadge status={job.status as any} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Start Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{formatDateTime(job.scheduled_date, job.scheduled_time)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">End Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{formatDateTime(job.end_date, job.end_time)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Duration</p>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{formatDuration(job.estimated_duration_minutes)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t">
            {job.assigned_technician ? (
              <>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={job.assigned_technician.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(job.assigned_technician.full_name)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{job.assigned_technician.full_name}</span>
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="text-sm">Unassigned</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
