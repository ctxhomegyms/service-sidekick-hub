import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface QueuedOperation<T = unknown> {
  id: string;
  operation: () => Promise<T>;
  description: string;
  createdAt: number;
}

interface UseOfflineQueueOptions {
  onOperationComplete?: (id: string, result: unknown) => void;
  onOperationError?: (id: string, error: unknown) => void;
  showToasts?: boolean;
}

/**
 * Hook for queuing operations when offline and processing when back online
 */
export function useOfflineQueue<T = unknown>(options: UseOfflineQueueOptions = {}) {
  const { onOperationComplete, onOperationError, showToasts = true } = options;
  
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queue, setQueue] = useState<QueuedOperation<T>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (showToasts && queue.length > 0) {
        toast.info(`Back online. Processing ${queue.length} queued operation(s)...`);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (showToasts) {
        toast.warning('You are offline. Operations will be queued.');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queue.length, showToasts]);

  // Process queue when online
  const processQueue = useCallback(async () => {
    if (processingRef.current || queue.length === 0 || !isOnline) return;

    processingRef.current = true;
    setIsProcessing(true);

    const queueCopy = [...queue];
    
    for (const item of queueCopy) {
      if (!navigator.onLine) {
        // Went offline during processing
        break;
      }

      try {
        const result = await item.operation();
        onOperationComplete?.(item.id, result);
        setQueue(q => q.filter(op => op.id !== item.id));
        
        if (showToasts) {
          toast.success(`Completed: ${item.description}`);
        }
      } catch (error) {
        onOperationError?.(item.id, error);
        // Keep in queue for retry? Or remove? For now, remove on error
        setQueue(q => q.filter(op => op.id !== item.id));
        
        if (showToasts) {
          toast.error(`Failed: ${item.description}`);
        }
      }
    }

    processingRef.current = false;
    setIsProcessing(false);
  }, [queue, isOnline, onOperationComplete, onOperationError, showToasts]);

  // Auto-process when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isProcessing) {
      processQueue();
    }
  }, [isOnline, queue.length, isProcessing, processQueue]);

  const enqueue = useCallback((
    operation: () => Promise<T>,
    description: string
  ): string => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedOp: QueuedOperation<T> = {
      id,
      operation,
      description,
      createdAt: Date.now(),
    };

    setQueue(q => [...q, queuedOp]);

    if (showToasts && !isOnline) {
      toast.info(`Queued: ${description}`);
    }

    // If online, process immediately
    if (isOnline && !processingRef.current) {
      setTimeout(processQueue, 0);
    }

    return id;
  }, [isOnline, showToasts, processQueue]);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(q => q.filter(op => op.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  return {
    isOnline,
    isProcessing,
    queueLength: queue.length,
    queue,
    enqueue,
    removeFromQueue,
    clearQueue,
    processQueue,
  };
}
