import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Location {
  id: string;
  latitude: number;
  longitude: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MAPBOX_TOKEN = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
    
    if (!MAPBOX_TOKEN) {
      console.error('MAPBOX_PUBLIC_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Mapbox token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { locations, startLocation } = await req.json();
    
    // locations should be an array of { id, latitude, longitude }
    // startLocation is optional { latitude, longitude } for technician's current position
    
    if (!locations || !Array.isArray(locations) || locations.length < 2) {
      return new Response(
        JSON.stringify({ error: 'At least 2 locations are required for optimization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Optimizing route for ${locations.length} locations`);

    // Build coordinates string for Mapbox Optimization API
    // Format: lon,lat;lon,lat;...
    let allLocations: Location[] = [];
    let startIndex = 0;

    if (startLocation?.latitude && startLocation?.longitude) {
      // Add start location first
      allLocations.push({
        id: 'start',
        latitude: startLocation.latitude,
        longitude: startLocation.longitude,
      });
      startIndex = 1;
    }

    allLocations = [...allLocations, ...locations];

    const coordinates = allLocations
      .map(loc => `${loc.longitude},${loc.latitude}`)
      .join(';');

    // Call Mapbox Optimization API
    // source=first means start from the first coordinate
    // roundtrip=false means don't return to start
    const optimizationUrl = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordinates}?access_token=${MAPBOX_TOKEN}&source=first&roundtrip=false&geometries=geojson`;
    
    console.log('Calling Mapbox Optimization API...');
    const response = await fetch(optimizationUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mapbox optimization failed:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Route optimization failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.trips || data.trips.length === 0) {
      console.log('No optimized route found:', data.code);
      return new Response(
        JSON.stringify({ error: 'No optimized route found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trip = data.trips[0];
    const waypoints = data.waypoints;

    // waypoints contain the optimized order via waypoint_index
    // Map back to original job IDs
    const optimizedOrder = waypoints
      .sort((a: any, b: any) => a.waypoint_index - b.waypoint_index)
      .map((wp: any, idx: number) => {
        const originalIdx = wp.waypoint_index;
        return allLocations[originalIdx];
      })
      .filter((loc: Location) => loc.id !== 'start') // Remove start location from results
      .map((loc: Location) => loc.id);

    const durationSeconds = trip.duration;
    const distanceMeters = trip.distance;
    const durationMinutes = Math.round(durationSeconds / 60);
    const distanceMiles = (distanceMeters / 1609.34).toFixed(1);

    console.log(`Optimized route: ${durationMinutes} min, ${distanceMiles} miles, ${optimizedOrder.length} stops`);

    return new Response(
      JSON.stringify({
        optimized_order: optimizedOrder,
        total_duration_seconds: durationSeconds,
        total_duration_minutes: durationMinutes,
        total_distance_meters: distanceMeters,
        total_distance_miles: parseFloat(distanceMiles),
        geometry: trip.geometry,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in optimize-route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
