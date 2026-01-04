import { LayoutGrid, List, Kanban } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type JobsView = 'grid' | 'table' | 'kanban';

interface JobsViewToggleProps {
  view: JobsView;
  onViewChange: (view: JobsView) => void;
}

export function JobsViewToggle({ view, onViewChange }: JobsViewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={view}
      onValueChange={(value) => value && onViewChange(value as JobsView)}
      className="border rounded-md"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem value="grid" aria-label="Grid view" className="px-3">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>Grid View</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem value="table" aria-label="Table view" className="px-3">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>Table View</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem value="kanban" aria-label="Kanban view" className="px-3">
            <Kanban className="h-4 w-4" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>Kanban View</TooltipContent>
      </Tooltip>
    </ToggleGroup>
  );
}
