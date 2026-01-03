import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type JobStatus = 'pending' | 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface ScheduleFiltersState {
  statuses: JobStatus[];
  priorities: Priority[];
}

interface ScheduleFiltersProps {
  filters: ScheduleFiltersState;
  onChange: (filters: ScheduleFiltersState) => void;
}

const statusOptions: { value: JobStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'en_route', label: 'En Route' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityOptions: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function ScheduleFilters({ filters, onChange }: ScheduleFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeFilterCount = filters.statuses.length + filters.priorities.length;

  const toggleStatus = (status: JobStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses: newStatuses });
  };

  const togglePriority = (priority: Priority) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter((p) => p !== priority)
      : [...filters.priorities, priority];
    onChange({ ...filters, priorities: newPriorities });
  };

  const clearFilters = () => {
    onChange({ statuses: [], priorities: [] });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">Filters</h4>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-1 text-xs">
              Clear all
              <X className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>

        {/* Status filters */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase">Status</Label>
          <div className="space-y-2">
            {statusOptions.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  id={`status-${option.value}`}
                  checked={filters.statuses.includes(option.value)}
                  onCheckedChange={() => toggleStatus(option.value)}
                />
                <Label
                  htmlFor={`status-${option.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-3" />

        {/* Priority filters */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase">Priority</Label>
          <div className="space-y-2">
            {priorityOptions.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  id={`priority-${option.value}`}
                  checked={filters.priorities.includes(option.value)}
                  onCheckedChange={() => togglePriority(option.value)}
                />
                <Label
                  htmlFor={`priority-${option.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
