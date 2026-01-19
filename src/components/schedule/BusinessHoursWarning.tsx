import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { checkBusinessHours, BusinessHoursCheck } from '@/lib/edgeCases';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BusinessHoursWarningProps {
  date: string | null;
  time: string | null;
}

/**
 * Displays a warning when scheduling outside business hours
 */
export function BusinessHoursWarning({ date, time }: BusinessHoursWarningProps) {
  const [hoursCheck, setHoursCheck] = useState<BusinessHoursCheck | null>(null);

  useEffect(() => {
    if (date && time) {
      checkBusinessHours(date, time).then(setHoursCheck);
    } else {
      setHoursCheck(null);
    }
  }, [date, time]);

  if (!hoursCheck || hoursCheck.isWithinHours) {
    return null;
  }

  return (
    <Alert variant="default" className="bg-warning/10 border-warning/30">
      <AlertCircle className="h-4 w-4 text-warning" />
      <AlertDescription className="text-warning-foreground">
        {hoursCheck.message || 'Scheduled outside business hours'}
      </AlertDescription>
    </Alert>
  );
}
