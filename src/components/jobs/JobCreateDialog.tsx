import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { notifyJobScheduled } from '@/lib/notifications';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomerSelector } from './CustomerSelector';
import { JobTypeToggle } from './JobTypeToggle';
import { CrewSelector } from './CrewSelector';
import { TagSelector } from './TagSelector';
import { LineItemsEditor, LineItem } from './LineItemsEditor';
import { RecurrenceSettings, RecurrencePattern } from './RecurrenceSettings';
import { CollapsibleSection } from './CollapsibleSection';
import { Calendar, Users, Tag, ClipboardList, Settings, FileText } from 'lucide-react';

interface JobType {
  id: string;
  name: string;
  color: string;
}

interface ChecklistTemplate {
  id: string;
  name: string;
}

interface JobCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function JobCreateDialog({ open, onOpenChange, onSuccess }: JobCreateDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern | null>(null);
  const [scheduleLater, setScheduleLater] = useState(false);
  const [crewIds, setCrewIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  
  const [formData, setFormData] = useState({
    jobName: '',
    jobTypeId: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    timeWindowStart: '',
    timeWindowEnd: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    templateId: '',
    instructions: '',
    estimatedDuration: '60',
  });

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    const [jobTypesRes, templatesRes] = await Promise.all([
      supabase.from('job_types').select('id, name, color').order('name'),
      supabase.from('checklist_templates').select('id, name').order('name'),
    ]);

    if (jobTypesRes.data) setJobTypes(jobTypesRes.data);
    if (templatesRes.data) setTemplates(templatesRes.data);
  };

  const resetForm = () => {
    setCustomerId('');
    setIsRecurring(false);
    setRecurrencePattern(null);
    setScheduleLater(false);
    setCrewIds([]);
    setTagIds([]);
    setLineItems([]);
    setFormData({
      jobName: '',
      jobTypeId: '',
      priority: 'medium',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      timeWindowStart: '',
      timeWindowEnd: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      templateId: '',
      instructions: '',
      estimatedDuration: '60',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.jobName.trim()) {
      toast.error('Please enter a job name');
      return;
    }

    setIsSubmitting(true);

    try {
      // Geocode address if provided
      let latitude: number | null = null;
      let longitude: number | null = null;
      
      if (formData.address) {
        const { data: geoData } = await supabase.functions.invoke('geocode-address', {
          body: { 
            address: formData.address, 
            city: formData.city, 
            state: formData.state, 
            zip_code: formData.zipCode 
          }
        });
        if (geoData?.latitude && geoData?.longitude) {
          latitude = geoData.latitude;
          longitude = geoData.longitude;
        }
      }

      const isScheduled = !scheduleLater && !!formData.startDate;
      const primaryTechnician = crewIds.length > 0 ? crewIds[0] : null;

      // Create the job
      const { data: jobData, error: jobError } = await supabase.from('jobs').insert([{
        title: formData.jobName,
        customer_id: customerId || null,
        assigned_technician_id: primaryTechnician,
        job_type_id: formData.jobTypeId || null,
        priority: formData.priority,
        scheduled_date: isScheduled ? formData.startDate : null,
        scheduled_time: isScheduled ? formData.startTime || null : null,
        end_date: formData.endDate || null,
        end_time: formData.endTime || null,
        time_window_start: formData.timeWindowStart || null,
        time_window_end: formData.timeWindowEnd || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zipCode || null,
        latitude,
        longitude,
        instructions: formData.instructions || null,
        estimated_duration_minutes: parseInt(formData.estimatedDuration) || 60,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring && recurrencePattern ? JSON.parse(JSON.stringify(recurrencePattern)) : null,
        created_by: user?.id,
        status: isScheduled ? 'scheduled' : 'pending',
      }]).select('id').single();

      if (jobError) throw jobError;

      const jobId = jobData.id;

      // Add crew members
      if (crewIds.length > 0) {
        const crewInserts = crewIds.map((techId, index) => ({
          job_id: jobId,
          technician_id: techId,
          is_primary: index === 0,
        }));
        await supabase.from('job_crew').insert(crewInserts);
      }

      // Add tags
      if (tagIds.length > 0) {
        const tagInserts = tagIds.map(tagId => ({
          job_id: jobId,
          tag_id: tagId,
        }));
        await supabase.from('job_tags').insert(tagInserts);
      }

      // Add line items
      if (lineItems.length > 0) {
        const lineItemInserts = lineItems.map((item, index) => ({
          job_id: jobId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice || null,
          sort_order: index,
        }));
        await supabase.from('job_line_items').insert(lineItemInserts);
      }

      // Add checklist items from template
      if (formData.templateId) {
        const { data: templateItems } = await supabase
          .from('checklist_template_items')
          .select('item_text, item_type, is_required, options, sort_order')
          .eq('template_id', formData.templateId)
          .order('sort_order');

        if (templateItems && templateItems.length > 0) {
          const checklistInserts = templateItems.map(item => ({
            job_id: jobId,
            item_text: item.item_text,
            item_type: item.item_type,
            is_required: item.is_required,
            options: item.options,
            sort_order: item.sort_order,
          }));
          await supabase.from('job_checklist_items').insert(checklistInserts);
        }
      }

      // Send notification if scheduled with customer
      if (isScheduled && customerId) {
        notifyJobScheduled(jobId);
      }

      toast.success('Job created successfully');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating job:', error);
      toast.error(error.message || 'Failed to create job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl">Create New Job</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Customer Selection */}
              <div className="space-y-2">
                <Label>Customer</Label>
                <CustomerSelector 
                  value={customerId} 
                  onChange={setCustomerId}
                  onAddressSelect={(address) => {
                    setFormData(f => ({
                      ...f,
                      address: address.address || '',
                      city: address.city || '',
                      state: address.state || '',
                      zipCode: address.zipCode || '',
                    }));
                  }}
                />
              </div>

              {/* Job Type Toggle */}
              <div className="space-y-2">
                <JobTypeToggle isRecurring={isRecurring} onChange={setIsRecurring} />
              </div>

              {/* Recurrence Settings */}
              {isRecurring && (
                <RecurrenceSettings 
                  value={recurrencePattern} 
                  onChange={setRecurrencePattern} 
                />
              )}

              {/* Date/Time Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(f => ({ ...f, startDate: e.target.value }))}
                      disabled={scheduleLater}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData(f => ({ ...f, startTime: e.target.value }))}
                      disabled={scheduleLater}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(f => ({ ...f, endDate: e.target.value }))}
                      disabled={scheduleLater}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData(f => ({ ...f, endTime: e.target.value }))}
                      disabled={scheduleLater}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="scheduleLater" 
                    checked={scheduleLater}
                    onCheckedChange={(checked) => setScheduleLater(checked === true)}
                  />
                  <Label htmlFor="scheduleLater" className="text-sm font-normal cursor-pointer">
                    Schedule later
                  </Label>
                </div>
              </div>

              {/* Crew Section */}
              <CollapsibleSection 
                title="Crew" 
                icon={<Users className="w-4 h-4" />}
                defaultOpen={false}
              >
                <CrewSelector value={crewIds} onChange={setCrewIds} />
              </CollapsibleSection>

              {/* Tags Section */}
              <CollapsibleSection 
                title="Tags" 
                icon={<Tag className="w-4 h-4" />}
                defaultOpen={false}
              >
                <TagSelector value={tagIds} onChange={setTagIds} />
              </CollapsibleSection>

              {/* Checklist Section */}
              <CollapsibleSection 
                title="Checklist" 
                icon={<ClipboardList className="w-4 h-4" />}
                defaultOpen={false}
              >
                <Select
                  value={formData.templateId}
                  onValueChange={(value) => setFormData(f => ({ ...f, templateId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a checklist template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CollapsibleSection>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Calendar Section */}
              <CollapsibleSection 
                title="Job Details" 
                icon={<Calendar className="w-4 h-4" />}
                defaultOpen={true}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jobName">Job Name *</Label>
                      <Input
                        id="jobName"
                        value={formData.jobName}
                        onChange={(e) => setFormData(f => ({ ...f, jobName: e.target.value }))}
                        placeholder="e.g., AC Repair"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobType">Job Type</Label>
                      <Select
                        value={formData.jobTypeId}
                        onValueChange={(value) => setFormData(f => ({ ...f, jobTypeId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobTypes.map((jt) => (
                            <SelectItem key={jt.id} value={jt.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: jt.color }} 
                                />
                                {jt.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                          setFormData(f => ({ ...f, priority: value }))
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
                      <Label htmlFor="duration">Est. Duration (min)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="15"
                        step="15"
                        value={formData.estimatedDuration}
                        onChange={(e) => setFormData(f => ({ ...f, estimatedDuration: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timeWindowStart">Time Window Start</Label>
                      <Input
                        id="timeWindowStart"
                        type="time"
                        value={formData.timeWindowStart}
                        onChange={(e) => setFormData(f => ({ ...f, timeWindowStart: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeWindowEnd">Time Window End</Label>
                      <Input
                        id="timeWindowEnd"
                        type="time"
                        value={formData.timeWindowEnd}
                        onChange={(e) => setFormData(f => ({ ...f, timeWindowEnd: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Location Section */}
              <CollapsibleSection 
                title="Location" 
                icon={<Settings className="w-4 h-4" />}
                defaultOpen={true}
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(f => ({ ...f, address: e.target.value }))}
                      placeholder="Street address"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData(f => ({ ...f, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData(f => ({ ...f, state: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => setFormData(f => ({ ...f, zipCode: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Line Items Section */}
              <CollapsibleSection 
                title="Line Items" 
                icon={<FileText className="w-4 h-4" />}
                defaultOpen={false}
              >
                <LineItemsEditor items={lineItems} onChange={setLineItems} />
              </CollapsibleSection>

              {/* Instructions Section */}
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData(f => ({ ...f, instructions: e.target.value }))}
                  placeholder="Special instructions for this job..."
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t bg-muted/30">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Job'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
