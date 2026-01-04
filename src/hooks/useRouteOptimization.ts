import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Location {
  id: string;
  latitude: number;
  longitude: number;
}

interface StartLocation {
  latitude: number;
  longitude: number;
}

interface OptimizedRoute {
  optimized_order: string[];
  total_duration_seconds: number;
  total_duration_minutes: number;
  total_distance_meters: number;
  total_distance_miles: number;
  geometry: GeoJSON.LineString;
}

export function useRouteOptimization() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optimizeRoute = useCallback(async (
    locations: Location[],
    startLocation?: StartLocation
  ): Promise<OptimizedRoute | null> => {
    if (locations.length < 2) {
      setError('At least 2 locations are required');
      return null;
    }

    setIsOptimizing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('optimize-route', {
        body: { locations, startLocation }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data as OptimizedRoute;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to optimize route';
      setError(message);
      console.error('Route optimization error:', err);
      return null;
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  return {
    optimizeRoute,
    isOptimizing,
    error,
  };
}
