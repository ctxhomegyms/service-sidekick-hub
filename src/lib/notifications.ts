import { supabase } from '@/integrations/supabase/client';

type NotificationType = 
  | 'job_scheduled' 
  | 'technician_en_route' 
  | 'job_completed'
  | 'job_rescheduled'
  | 'job_cancelled'
  | 'technician_assigned';

interface NotificationExtraData {
  previous_date?: string;
  previous_time?: string;
  new_date?: string;
  new_time?: string;
  cancellation_reason?: string;
}

export async function sendJobNotification(
  jobId: string,
  notificationType: NotificationType,
  extraData?: NotificationExtraData
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        job_id: jobId,
        notification_type: notificationType,
        extra_data: extraData,
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

export function notifyJobRescheduled(
  jobId: string, 
  previousDate?: string, 
  previousTime?: string
) {
  return sendJobNotification(jobId, 'job_rescheduled', {
    previous_date: previousDate,
    previous_time: previousTime,
  });
}

export function notifyJobCancelled(jobId: string, reason?: string) {
  return sendJobNotification(jobId, 'job_cancelled', {
    cancellation_reason: reason,
  });
}

export function notifyTechnicianAssigned(jobId: string) {
  return sendJobNotification(jobId, 'technician_assigned');
}
