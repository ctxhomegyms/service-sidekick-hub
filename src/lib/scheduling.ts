import { supabase } from "@/integrations/supabase/client";

export interface SchedulingConflict {
  job_id: string;
  job_title: string;
  scheduled_date: string;
  scheduled_time: string;
  end_time: string;
  customer_name: string | null;
}

/**
 * Check if a technician has any scheduling conflicts for a given time slot
 */
export async function checkTechnicianAvailability(
  technicianId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeJobId?: string
): Promise<{ hasConflict: boolean; conflicts: SchedulingConflict[] }> {
  if (!technicianId || !date || !startTime) {
    return { hasConflict: false, conflicts: [] };
  }

  const { data, error } = await supabase.rpc('check_technician_availability', {
    p_technician_id: technicianId,
    p_date: date,
    p_start_time: startTime,
    p_end_time: endTime || calculateEndTime(startTime, 60),
    p_exclude_job_id: excludeJobId || null
  });

  if (error) {
    console.error('Error checking technician availability:', error);
    return { hasConflict: false, conflicts: [] };
  }

  const conflicts = (data || []) as SchedulingConflict[];
  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

/**
 * Calculate end time from start time and duration in minutes
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`;
}

/**
 * Format time for display
 */
export function formatTimeDisplay(time: string | null): string {
  if (!time) return '';
  
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Check if a job can be scheduled at a given time without conflicts
 */
export async function canScheduleJob(
  technicianId: string | null,
  date: string | null,
  startTime: string | null,
  durationMinutes: number = 60,
  excludeJobId?: string
): Promise<{ canSchedule: boolean; conflicts: SchedulingConflict[] }> {
  if (!technicianId || !date || !startTime) {
    return { canSchedule: true, conflicts: [] };
  }

  const endTime = calculateEndTime(startTime, durationMinutes);
  const result = await checkTechnicianAvailability(
    technicianId,
    date,
    startTime,
    endTime,
    excludeJobId
  );

  return {
    canSchedule: !result.hasConflict,
    conflicts: result.conflicts
  };
}
