import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Bell, MessageSquare, Edit2, Loader2, Info } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type AutoReplyRow = Database['public']['Tables']['auto_reply_settings']['Row'];
type AutoReplyTrigger = Database['public']['Enums']['auto_reply_trigger'];

const TRIGGER_LABELS: Record<string, string> = {
  after_hours: 'After Hours',
  busy: 'Busy Line',
  missed_call: 'Missed Call',
  voicemail: 'Voicemail',
};

// Compliance keyword response labels — shown separately from auto-reply triggers
const COMPLIANCE_TRIGGER_LABELS: Record<string, string> = {
  stop_keyword: 'STOP Reply (Opt-Out Confirmation)',
  help_keyword: 'HELP Reply (Support Info)',
  start_keyword: 'START Reply (Re-Subscribe Confirmation)',
};

const ALL_TRIGGER_LABELS: Record<string, string> = {
  ...TRIGGER_LABELS,
  ...COMPLIANCE_TRIGGER_LABELS,
};

const TEMPLATE_VARIABLES = [
  { key: '{{customer_name}}', description: 'Customer\'s full name' },
  { key: '{{company_name}}', description: 'Your company name' },
  { key: '{{company_phone}}', description: 'Company phone number' },
  { key: '{{callback_link}}', description: 'Request callback link' },
];

export function NotificationTemplatesManager() {
  const [templates, setTemplates] = useState<AutoReplyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AutoReplyRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('auto_reply_settings')
        .select('*')
        .order('trigger_type');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load notification templates');
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('auto_reply_settings')
        .update({
          message_template: editingTemplate.message_template,
          is_active: editingTemplate.is_active,
          delay_seconds: editingTemplate.delay_seconds,
          business_hours_only: editingTemplate.business_hours_only,
          include_callback_link: editingTemplate.include_callback_link,
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;
      
      setTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
      setDialogOpen(false);
      toast.success('Template updated');
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (template: AutoReplyRow) => {
    try {
      const { error } = await supabase
        .from('auto_reply_settings')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;
      
      setTemplates(templates.map(t => 
        t.id === template.id ? { ...t, is_active: !t.is_active } : t
      ));
      toast.success(`${TRIGGER_LABELS[template.trigger_type]} ${!template.is_active ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('Failed to update template');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Auto-Reply Templates</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Auto-Reply Templates
        </CardTitle>
        <CardDescription>
          Customize SMS templates for automatic customer notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No auto-reply templates configured</p>
            <p className="text-sm">Templates will appear here once created</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {ALL_TRIGGER_LABELS[template.trigger_type] || template.trigger_type}
                    </span>
                    <Badge variant="outline" className="gap-1">
                      <MessageSquare className="h-3 w-3" /> SMS
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {template.message_template}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Delay: {template.delay_seconds}s
                    {template.business_hours_only && ' • Business hours only'}
                    {template.include_callback_link && ' • Includes callback link'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={template.is_active}
                    onCheckedChange={() => toggleEnabled(template)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTemplate(template);
                      setDialogOpen(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Template Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Edit {editingTemplate ? (ALL_TRIGGER_LABELS[editingTemplate.trigger_type] || editingTemplate.trigger_type) : ''} Template
              </DialogTitle>
            </DialogHeader>
            
            {editingTemplate && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Delay (seconds)</Label>
                    <Input
                      type="number"
                      value={editingTemplate.delay_seconds}
                      onChange={(e) => setEditingTemplate({ 
                        ...editingTemplate, 
                        delay_seconds: parseInt(e.target.value) || 0
                      })}
                      placeholder="30"
                    />
                  </div>
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={editingTemplate.is_active}
                        onCheckedChange={(checked) => setEditingTemplate({ 
                          ...editingTemplate, 
                          is_active: checked 
                        })}
                      />
                      <Label>Enabled</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={editingTemplate.business_hours_only}
                        onCheckedChange={(checked) => setEditingTemplate({ 
                          ...editingTemplate, 
                          business_hours_only: checked 
                        })}
                      />
                      <Label>Business hours only</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={editingTemplate.include_callback_link}
                        onCheckedChange={(checked) => setEditingTemplate({ 
                          ...editingTemplate, 
                          include_callback_link: checked 
                        })}
                      />
                      <Label>Include callback link</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>SMS Message</Label>
                  <Textarea
                    value={editingTemplate.message_template}
                    onChange={(e) => setEditingTemplate({ 
                      ...editingTemplate, 
                      message_template: e.target.value 
                    })}
                    placeholder="Hi {{customer_name}}, we missed your call. We'll get back to you shortly!"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    {editingTemplate.message_template.length}/160 characters
                  </p>
                </div>

                {/* Variable Reference */}
                <div className="rounded-lg border p-4 bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Available Variables</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <div key={v.key} className="flex items-center gap-2">
                        <code className="px-1.5 py-0.5 rounded bg-background font-mono">
                          {v.key}
                        </code>
                        <span className="text-muted-foreground">{v.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={updateTemplate} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
