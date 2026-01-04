import { useState, useEffect, useCallback } from 'react';
import { MapPin, MapPinOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type PermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable' | 'loading';

export function LocationPermission() {
  const { user } = useAuth();
  const [permissionState, setPermissionState] = useState<PermissionState>('loading');
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Check initial permission state
  useEffect(() => {
    if (!navigator.geolocation) {
      setPermissionState('unavailable');
      return;
    }

    // Check if permission was already granted
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionState(result.state as PermissionState);
        
        // If already granted, check if we have an active tracking session
        if (result.state === 'granted') {
          checkExistingTracking();
        }

        // Listen for permission changes
        result.onchange = () => {
          setPermissionState(result.state as PermissionState);
          if (result.state === 'denied') {
            stopTracking();
          }
        };
      });
    } else {
      setPermissionState('prompt');
    }
  }, []);

  const checkExistingTracking = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('technician_locations')
      .select('is_on_shift')
      .eq('technician_id', user.id)
      .single();
    
    if (data?.is_on_shift) {
      startTracking();
    }
  };

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
      toast.error('Geolocation is not supported');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateLocationInDb(latitude, longitude);
        setIsTracking(true);
        setPermissionState('granted');
      },
      (error) => {
        console.error('Geolocation error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState('denied');
          toast.error('Location permission denied');
        } else {
          toast.error('Unable to get location');
        }
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );

    setWatchId(id);
  }, [updateLocationInDb]);

  const stopTracking = useCallback(async () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    
    if (user) {
      await supabase
        .from('technician_locations')
        .upsert({
          technician_id: user.id,
          latitude: 0,
          longitude: 0,
          is_on_shift: false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'technician_id',
        });
    }
    
    setIsTracking(false);
    toast.success('Location sharing stopped');
  }, [watchId, user]);

  const requestPermission = () => {
    startTracking();
    toast.success('Location sharing enabled');
  };

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      requestPermission();
    }
  };

  // Keep updating location while tracking
  useEffect(() => {
    if (!isTracking) return;

    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateLocationInDb(position.coords.latitude, position.coords.longitude);
        },
        (error) => console.error('Location update error:', error),
        { enableHighAccuracy: true }
      );
    }, 30000);

    return () => clearInterval(intervalId);
  }, [isTracking, updateLocationInDb]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  if (permissionState === 'loading') {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 p-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Checking location permissions...</span>
        </CardContent>
      </Card>
    );
  }

  if (permissionState === 'unavailable') {
    return (
      <Card className="border-dashed border-destructive/50 bg-destructive/5">
        <CardContent className="flex items-center gap-3 p-3">
          <MapPinOff className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">Location not available on this device</span>
        </CardContent>
      </Card>
    );
  }

  if (permissionState === 'denied') {
    return (
      <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3">
          <div className="flex items-center gap-3">
            <MapPinOff className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm text-amber-700">Location permission denied. Enable in browser settings.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isTracking ? 'border-green-500/50 bg-green-500/5' : 'border-dashed'}>
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-3">
          {isTracking ? (
            <>
              <div className="relative shrink-0">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <span className="text-sm text-green-700">Sharing location with dispatch</span>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Share your location with dispatch</span>
            </>
          )}
        </div>
        <Button
          size="sm"
          variant={isTracking ? 'destructive' : 'default'}
          onClick={toggleTracking}
          className="w-full sm:w-auto shrink-0"
        >
          {isTracking ? 'Stop Sharing' : 'Share Location'}
        </Button>
      </CardContent>
    </Card>
  );
}
