import { supabase } from "@/integrations/supabase/client";

export type JobStatus = 'pending' | 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';

// Define valid status transitions
const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending: ['scheduled', 'cancelled'],
  scheduled: ['en_route', 'in_progress', 'cancelled', 'pending'],
  en_route: ['in_progress', 'scheduled', 'cancelled'],
  in_progress: ['completed', 'cancelled', 'en_route'],
  completed: ['in_progress'], // Allow reopening
  cancelled: ['pending', 'scheduled'] // Allow reactivating
};

// Status display names
export const STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  en_route: 'En Route',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  currentStatus: JobStatus,
  newStatus: JobStatus
): boolean {
  if (currentStatus === newStatus) return true;
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Get valid next statuses from current status
 */
export function getValidNextStatuses(currentStatus: JobStatus): JobStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if job completion is blocked by incomplete checklist items
 */
export async function canCompleteJob(jobId: string): Promise<{
  canComplete: boolean;
  reason?: string;
  incompleteItems?: number;
  requiredItems?: number;
}> {
  // Get job type to check if checklist completion is required
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('job_type_id, service_category')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    return { canComplete: true }; // Allow if job not found
  }

  // Check if job type requires checklist completion
  if (job.job_type_id) {
    const { data: jobType } = await supabase
      .from('job_types')
      .select('require_checklist_completion')
      .eq('id', job.job_type_id)
      .single();

    if (jobType?.require_checklist_completion) {
      // Get checklist items
      const { data: items } = await supabase
        .from('job_checklist_items')
        .select('is_completed, is_required')
        .eq('job_id', jobId);

      if (items && items.length > 0) {
        const requiredItems = items.filter(i => i.is_required);
        const incompleteRequired = requiredItems.filter(i => !i.is_completed);

        if (incompleteRequired.length > 0) {
          return {
            canComplete: false,
            reason: `${incompleteRequired.length} required checklist item(s) incomplete`,
            incompleteItems: incompleteRequired.length,
            requiredItems: requiredItems.length
          };
        }
      }
    }
  }

  return { canComplete: true };
}

/**
 * Validate job address is present for pickup/delivery jobs
 */
export function validateJobAddress(
  serviceCategory: string | null,
  address: string | null,
  city: string | null
): { isValid: boolean; warning?: string } {
  const requiresAddress = ['pickup', 'delivery', 'installation', 'service'].includes(
    serviceCategory?.toLowerCase() || ''
  );

  if (requiresAddress && (!address || address.trim() === '')) {
    return {
      isValid: false,
      warning: `${serviceCategory || 'This job type'} requires an address`
    };
  }

  return { isValid: true };
}

/**
 * Update job status with validation
 */
export async function updateJobStatus(
  jobId: string,
  newStatus: JobStatus,
  options: { force?: boolean; userId?: string } = {}
): Promise<{ success: boolean; error?: string }> {
  // Get current job status
  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('status')
    .eq('id', jobId)
    .single();

  if (fetchError || !job) {
    return { success: false, error: 'Job not found' };
  }

  const currentStatus = job.status as JobStatus;

  // Check if transition is valid
  if (!options.force && !isValidStatusTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Cannot change status from ${STATUS_LABELS[currentStatus]} to ${STATUS_LABELS[newStatus]}`
    };
  }

  // Check if completion is blocked
  if (newStatus === 'completed') {
    const completionCheck = await canCompleteJob(jobId);
    if (!completionCheck.canComplete) {
      return { success: false, error: completionCheck.reason };
    }
  }

  // Update status
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString()
  };

  // Set timestamps based on status
  if (newStatus === 'in_progress' && !job.status?.includes('in_progress')) {
    updateData.started_at = new Date().toISOString();
  } else if (newStatus === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from('jobs')
    .update(updateData)
    .eq('id', jobId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}
