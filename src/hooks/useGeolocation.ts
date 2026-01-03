import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  isTracking: boolean;
}

export const useGeolocation = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null,
    isTracking: false,
  });
  const [isOnShift, setIsOnShift] = useState(false);

  // Fetch initial shift status
  useEffect(() => {
    const fetchShiftStatus = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('technician_locations')
        .select('is_on_shift, latitude, longitude')
        .eq('technician_id', user.id)
        .single();
      
      if (data) {
        setIsOnShift(data.is_on_shift);
        if (data.latitude && data.longitude) {
          setLocation(prev => ({
            ...prev,
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
          }));
        }
      }
    };
    
    fetchShiftStatus();
  }, [user]);

  const updateLocationInDb = useCallback(async (lat: number, lng: number) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('technician_locations')
      .upsert({
        technician_id: user.id,
        latitude: lat,
        longitude: lng,
        is_on_shift: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'technician_id',
      });
    
    if (error) {
      console.error('Error updating location:', error);
    }
  }, [user]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Geolocation not supported' }));
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocation(prev => ({ ...prev, isTracking: true }));
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({
          latitude,
          longitude,
          error: null,
          isTracking: true,
        });
        updateLocationInDb(latitude, longitude);
      },
      (error) => {
        setLocation(prev => ({
          ...prev,
          error: error.message,
          isTracking: false,
        }));
        toast.error('Unable to get your location');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );

    return watchId;
  }, [updateLocationInDb]);

  const toggleShift = useCallback(async () => {
    if (!user) return;
    
    const newShiftStatus = !isOnShift;
    setIsOnShift(newShiftStatus);
    
    if (newShiftStatus) {
      // Starting shift - begin tracking
      startTracking();
      toast.success('Shift started - location tracking enabled');
    } else {
      // Ending shift - update DB
      const { error } = await supabase
        .from('technician_locations')
        .upsert({
          technician_id: user.id,
          latitude: location.latitude || 0,
          longitude: location.longitude || 0,
          is_on_shift: false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'technician_id',
        });
      
      if (error) {
        console.error('Error ending shift:', error);
      }
      
      setLocation(prev => ({ ...prev, isTracking: false }));
      toast.success('Shift ended - location tracking disabled');
    }
  }, [user, isOnShift, location, startTracking]);

  // Auto-track when on shift
  useEffect(() => {
    let watchId: number | undefined;
    
    if (isOnShift && user) {
      watchId = startTracking();
    }
    
    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isOnShift, user, startTracking]);

  // Update location every 30 seconds when on shift
  useEffect(() => {
    if (!isOnShift || !location.latitude || !location.longitude) return;
    
    const intervalId = setInterval(() => {
      if (location.latitude && location.longitude) {
        updateLocationInDb(location.latitude, location.longitude);
      }
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [isOnShift, location.latitude, location.longitude, updateLocationInDb]);

  return {
    location,
    isOnShift,
    toggleShift,
  };
};
