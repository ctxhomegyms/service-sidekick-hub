import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimeGridProps {
  startHour?: number;
  endHour?: number;
  slotHeight?: number;
  children: React.ReactNode;
}

export function TimeGrid({
  startHour = 6,
  endHour = 20,
  slotHeight = 60,
  children,
}: TimeGridProps) {
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      slots.push(`${hour12}:00 ${ampm}`);
    }
    return slots;
  }, [startHour, endHour]);

  return (
    <ScrollArea className="h-[calc(100vh-280px)] rounded-lg border bg-background">
      <div className="flex">
        {/* Time labels column */}
        <div className="sticky left-0 z-20 bg-background border-r w-20 flex-shrink-0">
          {/* Header spacer */}
          <div className="h-[60px] border-b" />
          {/* All-day spacer */}
          <div className="h-[40px] border-b flex items-center justify-center text-xs text-muted-foreground">
            All day
          </div>
          {/* Time labels */}
          {timeSlots.map((time, index) => (
            <div
              key={index}
              className="flex items-start justify-end pr-2 text-xs text-muted-foreground border-b border-dashed"
              style={{ height: slotHeight }}
            >
              <span className="-mt-2">{time}</span>
            </div>
          ))}
        </div>

        {/* Day columns container */}
        <div className="flex flex-1 divide-x">
          {children}
        </div>
      </div>
    </ScrollArea>
  );
}

export function useTimeGridConfig(startHour = 6, endHour = 20) {
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      slots.push(`${hour12}:00 ${ampm}`);
    }
    return slots;
  }, [startHour, endHour]);

  return { timeSlots, startHour, endHour, slotHeight: 60 };
}
