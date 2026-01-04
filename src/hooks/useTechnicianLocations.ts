import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

interface TechnicianLocation {
  id: string;
  technician_id: string;
  latitude: number;
  longitude: number;
  is_on_shift: boolean;
  updated_at: string;
  profile?: {
    full_name: string | null;
    email: string;
  };
}

export const useTechnicianLocations = () => {
  const [locations, setLocations] = useState<TechnicianLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      // Fetch all technicians who are actively sharing their location
      const { data, error } = await supabase
        .from('technician_locations')
        .select(`
          *,
          profile:profiles!technician_id (
            full_name,
            email
          )
        `)
        .eq('is_on_shift', true)
        .gt('latitude', 0); // Only include valid locations

      if (error) {
        console.error('Error fetching locations:', error);
      } else {
        const formatted = (data || []).map(loc => ({
          ...loc,
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
          profile: Array.isArray(loc.profile) ? loc.profile[0] : loc.profile,
        }));
        setLocations(formatted);
      }
      setLoading(false);
    };

    fetchLocations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('technician-locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'technician_locations',
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            setLocations(prev => 
              prev.filter(loc => loc.id !== (payload.old as any).id)
            );
          } else {
            const newLoc = payload.new as Tables<'technician_locations'>;
            
            // Fetch profile data for this technician
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', newLoc.technician_id)
              .single();

            const formattedLoc: TechnicianLocation = {
              ...newLoc,
              latitude: Number(newLoc.latitude),
              longitude: Number(newLoc.longitude),
              profile: profile || undefined,
            };

            if (!newLoc.is_on_shift) {
              setLocations(prev => 
                prev.filter(loc => loc.technician_id !== newLoc.technician_id)
              );
            } else {
              setLocations(prev => {
                const existing = prev.findIndex(loc => loc.technician_id === newLoc.technician_id);
                if (existing >= 0) {
                  const updated = [...prev];
                  updated[existing] = formattedLoc;
                  return updated;
                }
                return [...prev, formattedLoc];
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { locations, loading };
};
