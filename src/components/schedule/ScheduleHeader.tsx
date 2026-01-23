import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type ScheduleView = 'day' | 'week';

interface ScheduleHeaderProps {
  currentDate: Date;
  view: ScheduleView;
  onDateChange: (date: Date) => void;
  onViewChange: (view: ScheduleView) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onNewJob?: () => void;
  showNewJobButton?: boolean;
}

export function ScheduleHeader({
  currentDate,
  view,
  onDateChange,
  onViewChange,
  onToday,
  onPrevious,
  onNext,
  onNewJob,
  showNewJobButton = true,
}: ScheduleHeaderProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date);
      setDatePickerOpen(false);
    }
  };

  const getDateLabel = () => {
    if (view === 'day') {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    }
    return format(currentDate, 'MMMM yyyy');
  };

  return (
    <div className="flex items-center justify-between gap-4 px-1">
      {/* Left: Navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevious}
          className="h-9 w-9"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          className="h-9 px-4 font-medium"
        >
          Today
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          className="h-9 w-9"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Center: Date Display with Picker */}
      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "h-10 px-4 text-xl font-semibold hover:bg-muted/50",
              "flex items-center gap-2"
            )}
          >
            {getDateLabel()}
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={currentDate}
            onSelect={handleDateSelect}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Right: View Selector + New Job */}
      <div className="flex items-center gap-3">
        <Select value={view} onValueChange={(v) => onViewChange(v as ScheduleView)}>
          <SelectTrigger className="w-24 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="week">Week</SelectItem>
          </SelectContent>
        </Select>

        {showNewJobButton && onNewJob && (
          <Button onClick={onNewJob} size="sm" className="h-9 gap-1.5">
            <Plus className="h-4 w-4" />
            New Job
          </Button>
        )}
      </div>
    </div>
  );
}
