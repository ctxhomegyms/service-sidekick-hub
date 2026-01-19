import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface VersionConflictDialogProps {
  open: boolean;
  onRefresh: () => void;
  onOverwrite: () => void;
  onCancel: () => void;
  currentVersion: number;
  serverVersion: number;
}

/**
 * Dialog shown when concurrent edits are detected
 */
export function VersionConflictDialog({
  open,
  onRefresh,
  onOverwrite,
  onCancel,
  currentVersion,
  serverVersion,
}: VersionConflictDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            This record has been updated
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Someone else has made changes to this record since you started editing.
            </p>
            <p className="text-xs text-muted-foreground">
              Your version: {currentVersion} | Server version: {serverVersion}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} className="gap-2">
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button variant="default" onClick={onRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh & Discard My Changes
          </Button>
          <Button variant="destructive" onClick={onOverwrite} className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Overwrite Anyway
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
