import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar, CalendarDays, Map, LayoutGrid } from 'lucide-react';

export type ScheduleView = 'week' | 'day' | 'month' | 'map';

interface ViewToggleProps {
  value: ScheduleView;
  onChange: (value: ScheduleView) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as ScheduleView)}
      className="bg-muted p-1 rounded-lg"
    >
      <ToggleGroupItem value="week" aria-label="Week view" className="px-3 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm">
        <CalendarDays className="w-4 h-4 mr-1.5" />
        Week
      </ToggleGroupItem>
      <ToggleGroupItem value="day" aria-label="Day view" className="px-3 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm">
        <Calendar className="w-4 h-4 mr-1.5" />
        Day
      </ToggleGroupItem>
      <ToggleGroupItem value="month" aria-label="Month view" className="px-3 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm">
        <LayoutGrid className="w-4 h-4 mr-1.5" />
        Month
      </ToggleGroupItem>
      <ToggleGroupItem value="map" aria-label="Map view" className="px-3 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm">
        <Map className="w-4 h-4 mr-1.5" />
        Map
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
