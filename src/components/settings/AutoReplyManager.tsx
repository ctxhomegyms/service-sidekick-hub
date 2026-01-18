import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AutoReplySetting {
  id: string;
  trigger_type: 'missed_call' | 'after_hours' | 'busy' | 'voicemail';
  is_active: boolean;
  message_template: string;
  delay_seconds: number;
  business_hours_only: boolean;
  include_callback_link: boolean;
}

const TRIGGER_LABELS: Record<string, string> = {
  missed_call: 'Missed Call',
  after_hours: 'After Hours',
  busy: 'Busy Signal',
  voicemail: 'Voicemail Left',
};

const DEFAULT_TEMPLATES: Record<string, string> = {
  missed_call: "Hi! We missed your call. We'll get back to you shortly. Reply STOP to opt out.",
  after_hours: "Thanks for calling! We're currently closed and will return your call during business hours. Reply STOP to opt out.",
  busy: "All our lines are currently busy. We'll call you back soon. Reply STOP to opt out.",
  voicemail: "Thanks for leaving a voicemail! We received your message and will respond shortly. Reply STOP to opt out.",
};

export function AutoReplyManager() {
  const [settings, setSettings] = useState<AutoReplySetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('auto_reply_settings')
        .select('*')
        .order('trigger_type');

      if (error) throw error;

      if (data && data.length > 0) {
        setSettings(data);
      } else {
        // Create default settings
        const defaults: AutoReplySetting[] = [
          {
            id: crypto.randomUUID(),
            trigger_type: 'missed_call',
            is_active: true,
            message_template: DEFAULT_TEMPLATES.missed_call,
            delay_seconds: 60,
            business_hours_only: true,
            include_callback_link: false,
          },
          {
            id: crypto.randomUUID(),
            trigger_type: 'after_hours',
            is_active: true,
            message_template: DEFAULT_TEMPLATES.after_hours,
            delay_seconds: 30,
            business_hours_only: false,
            include_callback_link: false,
          },
        ];
        setSettings(defaults);
      }
    } catch (error) {
      console.error('Error fetching auto-reply settings:', error);
      toast.error('Failed to load auto-reply settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (id: string, field: keyof AutoReplySetting, value: any) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const addSetting = () => {
    const usedTriggers = settings.map((s) => s.trigger_type);
    const availableTriggers = Object.keys(TRIGGER_LABELS).filter(
      (t) => !usedTriggers.includes(t as any)
    ) as Array<'missed_call' | 'after_hours' | 'busy' | 'voicemail'>;

    if (availableTriggers.length === 0) {
      toast.error('All trigger types are already configured');
      return;
    }

    const newTrigger = availableTriggers[0];
    setSettings((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        trigger_type: newTrigger,
        is_active: false,
        message_template: DEFAULT_TEMPLATES[newTrigger],
        delay_seconds: 60,
        business_hours_only: true,
        include_callback_link: false,
      },
    ]);
  };

  const removeSetting = (id: string) => {
    setSettings((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Delete all existing and insert new
      await supabase.from('auto_reply_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      for (const setting of settings) {
        const { error } = await supabase.from('auto_reply_settings').insert({
          trigger_type: setting.trigger_type,
          is_active: setting.is_active,
          message_template: setting.message_template,
          delay_seconds: setting.delay_seconds,
          business_hours_only: setting.business_hours_only,
          include_callback_link: setting.include_callback_link,
        });

        if (error) throw error;
      }

      toast.success('Auto-reply settings saved');
      fetchSettings();
    } catch (error) {
      console.error('Error saving auto-reply settings:', error);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>SMS Auto-Reply</CardTitle>
              <CardDescription>Automatic SMS responses for missed calls and voicemails</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={addSetting}>
            <Plus className="h-4 w-4 mr-1" />
            Add Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {settings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No auto-reply rules configured</p>
            <Button variant="link" onClick={addSetting}>
              Add your first rule
            </Button>
          </div>
        ) : (
          settings.map((setting) => (
            <div key={setting.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={setting.is_active}
                    onCheckedChange={(checked) => updateSetting(setting.id, 'is_active', checked)}
                  />
                  <Badge variant={setting.is_active ? 'default' : 'secondary'}>
                    {TRIGGER_LABELS[setting.trigger_type]}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSetting(setting.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Message Template</Label>
                <Textarea
                  value={setting.message_template}
                  onChange={(e) => updateSetting(setting.id, 'message_template', e.target.value)}
                  rows={2}
                  placeholder="Enter the auto-reply message..."
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{customer_name}'} to personalize the message.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Delay (seconds)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={300}
                    value={setting.delay_seconds}
                    onChange={(e) => updateSetting(setting.id, 'delay_seconds', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={setting.business_hours_only}
                    onCheckedChange={(checked) => updateSetting(setting.id, 'business_hours_only', checked)}
                  />
                  <Label className="font-normal">Business hours only</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={setting.include_callback_link}
                    onCheckedChange={(checked) => updateSetting(setting.id, 'include_callback_link', checked)}
                  />
                  <Label className="font-normal">Include callback link</Label>
                </div>
              </div>
            </div>
          ))
        )}

        {settings.length > 0 && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save All Rules
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
