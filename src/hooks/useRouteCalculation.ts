import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface RouteData {
  duration_seconds: number;
  duration_minutes: number;
  distance_meters: number;
  distance_miles: number;
  geometry: GeoJSON.LineString;
}

export function useRouteCalculation() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRoute = useCallback(async (
    origin: Coordinates,
    destination: Coordinates
  ): Promise<RouteData | null> => {
    setIsCalculating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('calculate-route', {
        body: { origin, destination }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data as RouteData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to calculate route';
      setError(message);
      console.error('Route calculation error:', err);
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const geocodeAddress = useCallback(async (
    address: string,
    city?: string | null,
    state?: string | null,
    zipCode?: string | null
  ): Promise<Coordinates | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('geocode-address', {
        body: { address, city, state, zip_code: zipCode }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error || !data.latitude || !data.longitude) {
        return null;
      }

      return {
        latitude: data.latitude,
        longitude: data.longitude,
      };
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  }, []);

  return {
    calculateRoute,
    geocodeAddress,
    isCalculating,
    error,
  };
}
