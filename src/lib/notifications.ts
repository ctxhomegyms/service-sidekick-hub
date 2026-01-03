import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type NotificationType = 'job_scheduled' | 'technician_en_route' | 'job_completed';

export async function sendJobNotification(
  jobId: string,
  notificationType: NotificationType
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        job_id: jobId,
        notification_type: notificationType,
      },
    });

    if (error) {
      console.error('Notification error:', error);
      return false;
    }

    if (data?.success) {
      console.log('Notification sent successfully');
      return true;
    }

    // Non-error cases (no customer, disabled, etc.)
    if (data?.message) {
      console.log('Notification skipped:', data.message);
    }

    return true;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}

export function notifyJobScheduled(jobId: string) {
  return sendJobNotification(jobId, 'job_scheduled');
}

export function notifyTechnicianEnRoute(jobId: string) {
  return sendJobNotification(jobId, 'technician_en_route');
}

export function notifyJobCompleted(jobId: string) {
  return sendJobNotification(jobId, 'job_completed');
}
