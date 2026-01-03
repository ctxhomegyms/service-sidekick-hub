import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface JobPhoto {
  id: string;
  photo_url: string;
  photo_type: string;
  caption: string | null;
  created_at: string;
}

interface JobNote {
  id: string;
  note_text: string;
  created_at: string;
  author: {
    full_name: string | null;
  } | null;
}

interface JobSignature {
  id: string;
  signer_name: string;
  signature_url: string;
  signed_at: string;
}

interface CustomerJob {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  completed_at: string | null;
  address: string | null;
  city: string | null;
  technician: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  photos: JobPhoto[];
  notes: JobNote[];
  signature: JobSignature | null;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  notes: string | null;
  created_at: string;
}

export function useCustomerHistory(customerId: string | undefined) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<CustomerJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) {
      setIsLoading(false);
      return;
    }

    const fetchCustomerHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch customer details
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .maybeSingle();

        if (customerError) throw customerError;
        if (!customerData) {
          setError('Customer not found');
          return;
        }

        setCustomer(customerData);

        // Fetch jobs for this customer
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select(`
            id,
            title,
            description,
            status,
            priority,
            scheduled_date,
            scheduled_time,
            completed_at,
            address,
            city,
            assigned_technician_id
          `)
          .eq('customer_id', customerId)
          .order('scheduled_date', { ascending: false });

        if (jobsError) throw jobsError;

        // Fetch related data for each job
        const jobsWithDetails = await Promise.all(
          (jobsData || []).map(async (job) => {
            // Fetch technician profile
            let technician = null;
            if (job.assigned_technician_id) {
              const { data: techData } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', job.assigned_technician_id)
                .maybeSingle();
              technician = techData;
            }

            // Fetch photos
            const { data: photosData } = await supabase
              .from('job_photos')
              .select('id, photo_url, photo_type, caption, created_at')
              .eq('job_id', job.id)
              .order('created_at');

            // Fetch notes with author
            const { data: notesData } = await supabase
              .from('job_notes')
              .select('id, note_text, created_at, author_id')
              .eq('job_id', job.id)
              .order('created_at', { ascending: false });

            // Fetch author profiles for notes
            const notesWithAuthors = await Promise.all(
              (notesData || []).map(async (note) => {
                const { data: authorData } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', note.author_id)
                  .maybeSingle();
                return {
                  id: note.id,
                  note_text: note.note_text,
                  created_at: note.created_at,
                  author: authorData,
                };
              })
            );

            // Fetch signature
            const { data: signatureData } = await supabase
              .from('job_signatures')
              .select('id, signer_name, signature_url, signed_at')
              .eq('job_id', job.id)
              .maybeSingle();

            return {
              ...job,
              technician,
              photos: photosData || [],
              notes: notesWithAuthors,
              signature: signatureData,
            };
          })
        );

        setJobs(jobsWithDetails);
      } catch (err: any) {
        console.error('Error fetching customer history:', err);
        setError(err.message || 'Failed to load customer history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomerHistory();
  }, [customerId]);

  return { customer, jobs, isLoading, error };
}
