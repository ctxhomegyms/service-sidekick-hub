import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Phone, Trash2, GripVertical, Edit2, Loader2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type PhoneMenuRow = Database['public']['Tables']['phone_menus']['Row'];
type PhoneMenuOptionRow = Database['public']['Tables']['phone_menu_options']['Row'];
type PhoneMenuActionType = Database['public']['Enums']['phone_menu_action_type'];

interface PhoneMenu extends PhoneMenuRow {
  options?: PhoneMenuOptionRow[];
}

const ACTION_TYPES: { value: PhoneMenuActionType; label: string }[] = [
  { value: 'forward_call', label: 'Forward Call' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'submenu', label: 'Sub-menu' },
  { value: 'sms_reply', label: 'SMS Reply' },
  { value: 'play_message', label: 'Play Message' },
  { value: 'business_hours_check', label: 'Business Hours Check' },
];

export function PhoneMenuManager() {
  const [menus, setMenus] = useState<PhoneMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMenu, setEditingMenu] = useState<PhoneMenu | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newOption, setNewOption] = useState<{ digit: string; label: string; action_type: PhoneMenuActionType }>({ 
    digit: '', 
    label: '', 
    action_type: 'forward_call' 
  });

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    try {
      const { data, error } = await supabase
        .from('phone_menus')
        .select(`
          *,
          options:phone_menu_options(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMenus((data || []) as PhoneMenu[]);
    } catch (error) {
      console.error('Error fetching phone menus:', error);
      toast.error('Failed to load phone menus');
    } finally {
      setLoading(false);
    }
  };

  const createMenu = async () => {
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('phone_menus')
        .insert({
          name: 'New Phone Menu',
          greeting_text: 'Thank you for calling. Please listen to the following options.',
          is_active: false,
        })
        .select()
        .single();

      if (error) throw error;
      
      const newMenu: PhoneMenu = { ...data, options: [] };
      setMenus([newMenu, ...menus]);
      setEditingMenu(newMenu);
      setDialogOpen(true);
      toast.success('Phone menu created');
    } catch (error) {
      console.error('Error creating phone menu:', error);
      toast.error('Failed to create phone menu');
    } finally {
      setSaving(false);
    }
  };

  const updateMenu = async (menu: PhoneMenu) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('phone_menus')
        .update({
          name: menu.name,
          greeting_text: menu.greeting_text,
          is_active: menu.is_active,
        })
        .eq('id', menu.id);

      if (error) throw error;
      
      setMenus(menus.map(m => m.id === menu.id ? menu : m));
      toast.success('Phone menu updated');
    } catch (error) {
      console.error('Error updating phone menu:', error);
      toast.error('Failed to update phone menu');
    } finally {
      setSaving(false);
    }
  };

  const deleteMenu = async (id: string) => {
    if (!confirm('Are you sure you want to delete this phone menu?')) return;
    
    try {
      const { error } = await supabase
        .from('phone_menus')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setMenus(menus.filter(m => m.id !== id));
      toast.success('Phone menu deleted');
    } catch (error) {
      console.error('Error deleting phone menu:', error);
      toast.error('Failed to delete phone menu');
    }
  };

  const addOption = async () => {
    if (!editingMenu || !newOption.digit || !newOption.label) return;

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('phone_menu_options')
        .insert({
          menu_id: editingMenu.id,
          digit: newOption.digit,
          label: newOption.label,
          action_type: newOption.action_type,
          sort_order: (editingMenu.options?.length || 0) + 1,
        })
        .select()
        .single();

      if (error) throw error;

      const updatedMenu: PhoneMenu = {
        ...editingMenu,
        options: [...(editingMenu.options || []), data],
      };
      setEditingMenu(updatedMenu);
      setMenus(menus.map(m => m.id === editingMenu.id ? updatedMenu : m));
      setNewOption({ digit: '', label: '', action_type: 'forward_call' });
      toast.success('Option added');
    } catch (error) {
      console.error('Error adding option:', error);
      toast.error('Failed to add option');
    } finally {
      setSaving(false);
    }
  };

  const deleteOption = async (optionId: string) => {
    if (!editingMenu) return;

    try {
      const { error } = await supabase
        .from('phone_menu_options')
        .delete()
        .eq('id', optionId);

      if (error) throw error;

      const updatedMenu: PhoneMenu = {
        ...editingMenu,
        options: editingMenu.options?.filter(o => o.id !== optionId) || [],
      };
      setEditingMenu(updatedMenu);
      setMenus(menus.map(m => m.id === editingMenu.id ? updatedMenu : m));
      toast.success('Option removed');
    } catch (error) {
      console.error('Error deleting option:', error);
      toast.error('Failed to remove option');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>IVR Phone Menus</CardTitle>
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              IVR Phone Menus
            </CardTitle>
            <CardDescription>Configure automated phone menus for inbound calls</CardDescription>
          </div>
          <Button onClick={createMenu} disabled={saving} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Menu
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {menus.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No phone menus configured</p>
            <p className="text-sm">Create a menu to set up automated call routing</p>
          </div>
        ) : (
          <div className="space-y-3">
            {menus.map((menu) => (
              <div
                key={menu.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{menu.name}</span>
                    <Badge variant={menu.is_active ? 'default' : 'secondary'}>
                      {menu.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {menu.is_default && (
                      <Badge variant="outline">Default</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {menu.greeting_text || 'No greeting set'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {menu.options?.length || 0} option{(menu.options?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingMenu(menu);
                      setDialogOpen(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMenu(menu.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Menu Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Phone Menu</DialogTitle>
            </DialogHeader>
            
            {editingMenu && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Menu Name</Label>
                      <Input
                        value={editingMenu.name}
                        onChange={(e) => setEditingMenu({ ...editingMenu, name: e.target.value })}
                        placeholder="Main Menu"
                      />
                    </div>
                    <div className="flex items-center gap-4 pt-6">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={editingMenu.is_active}
                        onChange={(e) => setEditingMenu({ ...editingMenu, is_active: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Greeting Text</Label>
                    <Textarea
                      value={editingMenu.greeting_text || ''}
                      onChange={(e) => setEditingMenu({ ...editingMenu, greeting_text: e.target.value })}
                      placeholder="Thank you for calling. Please listen to the following options..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Menu Options */}
                <div className="space-y-4">
                  <Label>Menu Options</Label>
                  
                  {editingMenu.options && editingMenu.options.length > 0 && (
                    <div className="space-y-2">
                      {editingMenu.options.sort((a, b) => a.sort_order - b.sort_order).map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline" className="font-mono">
                            {option.digit}
                          </Badge>
                          <span className="flex-1 text-sm">{option.label}</span>
                          <Badge variant="secondary" className="text-xs">
                            {ACTION_TYPES.find(t => t.value === option.action_type)?.label || option.action_type}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteOption(option.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new option */}
                  <div className="grid gap-3 sm:grid-cols-4 p-3 rounded-lg border border-dashed">
                    <Input
                      placeholder="Digit (0-9)"
                      value={newOption.digit}
                      onChange={(e) => setNewOption({ ...newOption, digit: e.target.value })}
                      maxLength={1}
                    />
                    <Input
                      placeholder="Label"
                      value={newOption.label}
                      onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
                    />
                    <Select
                      value={newOption.action_type}
                      onValueChange={(v) => setNewOption({ ...newOption, action_type: v as PhoneMenuActionType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addOption} disabled={!newOption.digit || !newOption.label || saving}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editingMenu) {
                    updateMenu(editingMenu);
                    setDialogOpen(false);
                  }
                }}
                disabled={saving}
              >
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
