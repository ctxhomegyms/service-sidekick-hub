import { WifiOff, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  isOnline: boolean;
  queueLength?: number;
  isProcessing?: boolean;
  className?: string;
}

/**
 * Visual indicator for offline status and pending operations
 */
export function OfflineIndicator({
  isOnline,
  queueLength = 0,
  isProcessing = false,
  className,
}: OfflineIndicatorProps) {
  if (isOnline && queueLength === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {!isOnline && (
        <Badge variant="destructive" className="gap-1">
          <WifiOff className="h-3 w-3" />
          Offline
        </Badge>
      )}
      {queueLength > 0 && (
        <Badge variant="secondary" className="gap-1">
          {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
          {queueLength} pending
        </Badge>
      )}
    </div>
  );
}
