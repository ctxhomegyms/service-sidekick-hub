import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Voicemail } from 'lucide-react';

interface VoicemailSettings {
  id: string;
  is_active: boolean;
  greeting_text: string | null;
  greeting_audio_url: string | null;
  max_length_seconds: number;
  transcribe: boolean;
  notification_email: string | null;
  notification_sms: string | null;
}

export function VoicemailSettingsManager() {
  const [settings, setSettings] = useState<VoicemailSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    is_active: true,
    greeting_text: 'Thank you for calling. Please leave a message after the tone and we will get back to you as soon as possible.',
    max_length_seconds: 120,
    transcribe: true,
    notification_email: '',
    notification_sms: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('voicemail_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setFormData({
          is_active: data.is_active,
          greeting_text: data.greeting_text || '',
          max_length_seconds: data.max_length_seconds,
          transcribe: data.transcribe,
          notification_email: data.notification_email || '',
          notification_sms: data.notification_sms || '',
        });
      }
    } catch (error) {
      console.error('Error fetching voicemail settings:', error);
      toast.error('Failed to load voicemail settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        is_active: formData.is_active,
        greeting_text: formData.greeting_text || null,
        max_length_seconds: formData.max_length_seconds,
        transcribe: formData.transcribe,
        notification_email: formData.notification_email || null,
        notification_sms: formData.notification_sms || null,
        updated_at: new Date().toISOString(),
      };

      if (settings) {
        const { error } = await supabase
          .from('voicemail_settings')
          .update(payload)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('voicemail_settings')
          .insert(payload);

        if (error) throw error;
      }

      toast.success('Voicemail settings saved');
      fetchSettings();
    } catch (error) {
      console.error('Error saving voicemail settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Voicemail className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Voicemail Settings</CardTitle>
            <CardDescription>Configure voicemail greeting and notifications</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Voicemail</Label>
            <p className="text-sm text-muted-foreground">
              Allow callers to leave voicemails when unavailable
            </p>
          </div>
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="greeting_text">Voicemail Greeting</Label>
          <Textarea
            id="greeting_text"
            value={formData.greeting_text}
            onChange={(e) => setFormData({ ...formData, greeting_text: e.target.value })}
            placeholder="Enter the greeting message callers will hear..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            This message will be read aloud to callers before they can leave a message.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="max_length">Max Recording Length (seconds)</Label>
            <Input
              id="max_length"
              type="number"
              min={30}
              max={300}
              value={formData.max_length_seconds}
              onChange={(e) => setFormData({ ...formData, max_length_seconds: parseInt(e.target.value) || 120 })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Transcription</Label>
              <p className="text-sm text-muted-foreground">
                Auto-transcribe voicemails to text
              </p>
            </div>
            <Switch
              checked={formData.transcribe}
              onCheckedChange={(checked) => setFormData({ ...formData, transcribe: checked })}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-4">Notifications</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="notification_email">Notification Email</Label>
              <Input
                id="notification_email"
                type="email"
                value={formData.notification_email}
                onChange={(e) => setFormData({ ...formData, notification_email: e.target.value })}
                placeholder="alerts@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification_sms">Notification SMS</Label>
              <Input
                id="notification_sms"
                type="tel"
                value={formData.notification_sms}
                onChange={(e) => setFormData({ ...formData, notification_sms: e.target.value })}
                placeholder="+1 555-123-4567"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
