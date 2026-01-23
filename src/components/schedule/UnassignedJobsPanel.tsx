import { useMemo, useState } from 'react';
import { Search, Clock, MapPin, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import type { ScheduledJob } from './TimeGridSchedule';

interface UnassignedJobsPanelProps {
  jobs: ScheduledJob[];
  onJobClick: (job: ScheduledJob) => void;
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function UnassignedJobsPanel({
  jobs,
  onJobClick,
  className,
  collapsed = false,
  onToggleCollapse,
}: UnassignedJobsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredJobs = useMemo(() => {
    if (!searchQuery) return jobs;
    const query = searchQuery.toLowerCase();
    return jobs.filter(job =>
      job.title.toLowerCase().includes(query) ||
      (job.customer?.name?.toLowerCase().includes(query) ?? false)
    );
  }, [jobs, searchQuery]);

  if (collapsed) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn("h-full w-10 flex-col gap-1 p-2", className)}
        onClick={onToggleCollapse}
      >
        <Badge variant="secondary" className="h-6 w-6 p-0 justify-center text-xs">
          {jobs.length}
        </Badge>
        <span className="text-[10px] writing-mode-vertical rotate-180" style={{ writingMode: 'vertical-lr' }}>
          Unassigned
        </span>
        <ChevronRight className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2 pt-3 px-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Unassigned</h3>
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {jobs.length}
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-8 h-8 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="px-2 pb-2 space-y-1">
            {filteredJobs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                {searchQuery ? 'No matching jobs' : 'No unassigned jobs'}
              </p>
            ) : (
              filteredJobs.map((job) => (
                <button
                  key={job.id}
                  className={cn(
                    "w-full text-left p-2.5 rounded-md border bg-card",
                    "transition-all hover:shadow-sm hover:border-border",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20"
                  )}
                  onClick={() => onJobClick(job)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm truncate leading-tight">
                      {job.title}
                    </span>
                    <PriorityBadge priority={job.priority} />
                  </div>
                  
                  {job.customer && (
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {job.customer.name}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    {job.estimated_duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {job.estimated_duration_minutes}m
                      </span>
                    )}
                    {job.city && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {job.city}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
