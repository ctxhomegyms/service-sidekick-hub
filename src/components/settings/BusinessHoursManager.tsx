import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Clock } from 'lucide-react';

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

interface BusinessHour {
  id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

export function BusinessHoursManager() {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchHours();
  }, []);

  const fetchHours = async () => {
    try {
      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .order('day_of_week');

      if (error) throw error;

      // If no hours exist, create defaults
      if (!data || data.length === 0) {
        const defaults = DAYS.map((day) => ({
          id: crypto.randomUUID(),
          day_of_week: day.value,
          is_open: day.value >= 1 && day.value <= 5, // Mon-Fri open by default
          open_time: '08:00:00',
          close_time: '17:00:00',
        }));
        setHours(defaults);
      } else {
        setHours(data);
      }
    } catch (error) {
      console.error('Error fetching business hours:', error);
      toast.error('Failed to load business hours');
    } finally {
      setIsLoading(false);
    }
  };

  const updateHour = (dayOfWeek: number, field: keyof BusinessHour, value: any) => {
    setHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Upsert all hours
      for (const hour of hours) {
        const { error } = await supabase
          .from('business_hours')
          .upsert({
            id: hour.id,
            day_of_week: hour.day_of_week,
            is_open: hour.is_open,
            open_time: hour.open_time,
            close_time: hour.close_time,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'day_of_week'
          });

        if (error) throw error;
      }

      toast.success('Business hours saved');
      fetchHours();
    } catch (error) {
      console.error('Error saving business hours:', error);
      toast.error('Failed to save business hours');
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
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Business Hours</CardTitle>
            <CardDescription>Set when your business is open to receive calls</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {DAYS.map((day) => {
            const hour = hours.find((h) => h.day_of_week === day.value);
            if (!hour) return null;

            return (
              <div
                key={day.value}
                className="flex items-center gap-4 py-2 border-b border-border last:border-0"
              >
                <div className="w-24">
                  <Label className="font-medium">{day.label}</Label>
                </div>
                <Switch
                  checked={hour.is_open}
                  onCheckedChange={(checked) =>
                    updateHour(day.value, 'is_open', checked)
                  }
                />
                <span className="text-sm text-muted-foreground w-12">
                  {hour.is_open ? 'Open' : 'Closed'}
                </span>
                {hour.is_open && (
                  <>
                    <Input
                      type="time"
                      value={hour.open_time.slice(0, 5)}
                      onChange={(e) =>
                        updateHour(day.value, 'open_time', e.target.value + ':00')
                      }
                      className="w-32"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={hour.close_time.slice(0, 5)}
                      onChange={(e) =>
                        updateHour(day.value, 'close_time', e.target.value + ':00')
                      }
                      className="w-32"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Hours
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
