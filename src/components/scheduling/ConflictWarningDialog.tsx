import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SchedulingConflict, formatTimeDisplay } from '@/lib/scheduling';

interface ConflictWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: SchedulingConflict[];
  technicianName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConflictWarningDialog({
  open,
  onOpenChange,
  conflicts,
  technicianName,
  onConfirm,
  onCancel,
}: ConflictWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="w-5 h-5" />
            Scheduling Conflict
          </DialogTitle>
          <DialogDescription>
            {technicianName || 'The selected technician'} already has jobs scheduled during this time:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 my-4">
          {conflicts.map((conflict) => (
            <div
              key={conflict.job_id}
              className="rounded-lg border bg-muted/50 p-3 text-sm"
            >
              <p className="font-medium">{conflict.job_title}</p>
              {conflict.customer_name && (
                <p className="text-muted-foreground">{conflict.customer_name}</p>
              )}
              <p className="text-muted-foreground">
                {formatTimeDisplay(conflict.scheduled_time)} - {formatTimeDisplay(conflict.end_time)}
              </p>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Go Back
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
          >
            Schedule Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
