import { useState, useEffect } from 'react';
import { Mail, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface NotificationPreferencesProps {
  customerId: string;
}

interface Preferences {
  email_job_scheduled: boolean;
  email_technician_en_route: boolean;
  email_job_completed: boolean;
  email_job_rescheduled: boolean;
  email_job_cancelled: boolean;
  email_technician_assigned: boolean;
  sms_job_scheduled: boolean;
  sms_technician_en_route: boolean;
  sms_job_completed: boolean;
  sms_job_rescheduled: boolean;
  sms_job_cancelled: boolean;
  sms_technician_assigned: boolean;
  sms_reminder_24h: boolean;
  sms_reminder_1h: boolean;
  sms_reminder_morning: boolean;
}

const defaultPreferences: Preferences = {
  email_job_scheduled: true,
  email_technician_en_route: true,
  email_job_completed: true,
  email_job_rescheduled: true,
  email_job_cancelled: true,
  email_technician_assigned: true,
  sms_job_scheduled: false,
  sms_technician_en_route: false,
  sms_job_completed: false,
  sms_job_rescheduled: false,
  sms_job_cancelled: false,
  sms_technician_assigned: false,
  sms_reminder_24h: true,
  sms_reminder_1h: true,
  sms_reminder_morning: false,
};

export function NotificationPreferences({ customerId }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, [customerId]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          email_job_scheduled: data.email_job_scheduled,
          email_technician_en_route: data.email_technician_en_route,
          email_job_completed: data.email_job_completed,
          email_job_rescheduled: (data as any).email_job_rescheduled ?? true,
          email_job_cancelled: (data as any).email_job_cancelled ?? true,
          email_technician_assigned: (data as any).email_technician_assigned ?? true,
          sms_job_scheduled: data.sms_job_scheduled,
          sms_technician_en_route: data.sms_technician_en_route,
          sms_job_completed: data.sms_job_completed,
          sms_job_rescheduled: (data as any).sms_job_rescheduled ?? false,
          sms_job_cancelled: (data as any).sms_job_cancelled ?? false,
          sms_technician_assigned: (data as any).sms_technician_assigned ?? false,
          sms_reminder_24h: data.sms_reminder_24h ?? true,
          sms_reminder_1h: data.sms_reminder_1h ?? true,
          sms_reminder_morning: (data as any).sms_reminder_morning ?? false,
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (key: keyof Preferences, value: boolean) => {
    setIsSaving(true);
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          customer_id: customerId,
          ...newPreferences,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'customer_id' });

      if (error) throw error;
      toast.success('Preferences updated');
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
      // Revert on error
      setPreferences(preferences);
    } finally {
      setIsSaving(false);
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

  const notificationTypes = [
    { key: 'job_scheduled', label: 'Job Scheduled', description: 'When a service appointment is confirmed' },
    { key: 'technician_en_route', label: 'Technician En Route', description: 'When the technician is on their way' },
    { key: 'job_completed', label: 'Job Completed', description: 'When the service has been completed' },
    { key: 'job_rescheduled', label: 'Job Rescheduled', description: 'When an appointment is moved to a new time' },
    { key: 'job_cancelled', label: 'Job Cancelled', description: 'When an appointment is cancelled' },
    { key: 'technician_assigned', label: 'Technician Assigned', description: 'When a technician is assigned to the job' },
  ];

  const reminderTypes = [
    { key: 'sms_reminder_24h', label: '24-Hour Reminder', description: 'SMS reminder sent 24 hours before appointment' },
    { key: 'sms_reminder_1h', label: '1-Hour Reminder', description: 'SMS reminder sent 1 hour before appointment' },
    { key: 'sms_reminder_morning', label: 'Morning-Of Reminder', description: 'SMS reminder sent morning of appointment (8 AM)' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Notification Preferences</CardTitle>
        <CardDescription>Choose how this customer receives updates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-medium">Email Notifications</h4>
          </div>
          <div className="space-y-4">
            {notificationTypes.map((type) => {
              const key = `email_${type.key}` as keyof Preferences;
              return (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={key} className="text-sm font-medium">
                      {type.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                  <Switch
                    id={key}
                    checked={preferences[key]}
                    onCheckedChange={(checked) => updatePreference(key, checked)}
                    disabled={isSaving}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* SMS Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-medium">SMS Notifications</h4>
          </div>
          <div className="space-y-4">
            {notificationTypes.map((type) => {
              const key = `sms_${type.key}` as keyof Preferences;
              return (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={key} className="text-sm font-medium">
                      {type.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                  <Switch
                    id={key}
                    checked={preferences[key]}
                    onCheckedChange={(checked) => updatePreference(key, checked)}
                    disabled={isSaving}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Appointment Reminders */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-medium">Appointment Reminders</h4>
          </div>
          <div className="space-y-4">
            {reminderTypes.map((type) => {
              const key = type.key as keyof Preferences;
              return (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={key} className="text-sm font-medium">
                      {type.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                  <Switch
                    id={key}
                    checked={preferences[key]}
                    onCheckedChange={(checked) => updatePreference(key, checked)}
                    disabled={isSaving}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
