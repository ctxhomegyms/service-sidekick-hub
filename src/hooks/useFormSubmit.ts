import { useState, useCallback, useRef } from 'react';

interface UseFormSubmitOptions {
  minInterval?: number; // Minimum time between submissions in ms
  onError?: (error: unknown) => void;
}

/**
 * Hook to prevent form double-submission
 * Provides isSubmitting state and a guarded submit handler
 */
export function useFormSubmit(options: UseFormSubmitOptions = {}) {
  const { minInterval = 1000, onError } = options;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmitRef = useRef<number>(0);

  const handleSubmit = useCallback(
    async <T>(submitFn: () => Promise<T>): Promise<T | null> => {
      const now = Date.now();
      
      // Prevent rapid submissions
      if (isSubmitting) {
        console.log('Form submission blocked: already submitting');
        return null;
      }
      
      if (now - lastSubmitRef.current < minInterval) {
        console.log('Form submission blocked: too soon after last submission');
        return null;
      }

      setIsSubmitting(true);
      lastSubmitRef.current = now;

      try {
        const result = await submitFn();
        return result;
      } catch (error) {
        onError?.(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, minInterval, onError]
  );

  const guardedSubmit = useCallback(
    (e: React.FormEvent, submitFn: () => Promise<void>) => {
      e.preventDefault();
      handleSubmit(submitFn);
    },
    [handleSubmit]
  );

  return {
    isSubmitting,
    handleSubmit,
    guardedSubmit,
    canSubmit: !isSubmitting && Date.now() - lastSubmitRef.current >= minInterval
  };
}
