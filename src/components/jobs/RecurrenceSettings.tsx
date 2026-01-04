import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  interval: number;
  endDate?: string;
  occurrences?: number;
}

interface RecurrenceSettingsProps {
  value: RecurrencePattern | null;
  onChange: (pattern: RecurrencePattern) => void;
}

export function RecurrenceSettings({ value, onChange }: RecurrenceSettingsProps) {
  const pattern = value || { frequency: 'weekly', interval: 1 };

  const handleChange = (updates: Partial<RecurrencePattern>) => {
    onChange({ ...pattern, ...updates });
  };

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Frequency</Label>
          <Select
            value={pattern.frequency}
            onValueChange={(value: RecurrencePattern['frequency']) => handleChange({ frequency: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Every</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              max="12"
              value={pattern.interval}
              onChange={(e) => handleChange({ interval: parseInt(e.target.value) || 1 })}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">
              {pattern.frequency === 'daily' && 'day(s)'}
              {pattern.frequency === 'weekly' && 'week(s)'}
              {pattern.frequency === 'biweekly' && 'bi-week(s)'}
              {pattern.frequency === 'monthly' && 'month(s)'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>End Date (optional)</Label>
          <Input
            type="date"
            value={pattern.endDate || ''}
            onChange={(e) => handleChange({ endDate: e.target.value || undefined })}
          />
        </div>
        <div className="space-y-2">
          <Label>Or # of occurrences</Label>
          <Input
            type="number"
            min="1"
            max="100"
            value={pattern.occurrences || ''}
            onChange={(e) => handleChange({ occurrences: parseInt(e.target.value) || undefined })}
            placeholder="e.g., 10"
          />
        </div>
      </div>
    </div>
  );
}
