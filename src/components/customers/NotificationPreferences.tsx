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
  sms_job_scheduled: boolean;
  sms_technician_en_route: boolean;
  sms_job_completed: boolean;
}

const defaultPreferences: Preferences = {
  email_job_scheduled: true,
  email_technician_en_route: true,
  email_job_completed: true,
  sms_job_scheduled: false,
  sms_technician_en_route: false,
  sms_job_completed: false,
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
          sms_job_scheduled: data.sms_job_scheduled,
          sms_technician_en_route: data.sms_technician_en_route,
          sms_job_completed: data.sms_job_completed,
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
            <span className="text-xs bg-muted px-2 py-0.5 rounded">Coming Soon</span>
          </div>
          <div className="space-y-4 opacity-50">
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
                    disabled={true}
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
