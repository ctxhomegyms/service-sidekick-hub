import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { origin, destination } = await req.json();
    
    // origin and destination should be { latitude, longitude }
    if (!origin?.latitude || !origin?.longitude || !destination?.latitude || !destination?.longitude) {
      return new Response(
        JSON.stringify({ error: 'Origin and destination coordinates are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Calculating route from (${origin.latitude}, ${origin.longitude}) to (${destination.latitude}, ${destination.longitude})`);

    // Call Mapbox Directions API
    // Format: longitude,latitude;longitude,latitude
    const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`;
    
    const response = await fetch(directionsUrl);
    
    if (!response.ok) {
      console.error('Mapbox directions failed:', response.status);
      return new Response(
        JSON.stringify({ error: 'Route calculation failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.log('No route found');
      return new Response(
        JSON.stringify({ error: 'No route found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const route = data.routes[0];
    const durationSeconds = route.duration; // Duration in seconds
    const distanceMeters = route.distance; // Distance in meters
    const geometry = route.geometry; // GeoJSON geometry for drawing on map

    // Convert to more useful units
    const durationMinutes = Math.round(durationSeconds / 60);
    const distanceMiles = (distanceMeters / 1609.34).toFixed(1);

    console.log(`Route calculated: ${durationMinutes} min, ${distanceMiles} miles`);

    return new Response(
      JSON.stringify({ 
        duration_seconds: durationSeconds,
        duration_minutes: durationMinutes,
        distance_meters: distanceMeters,
        distance_miles: parseFloat(distanceMiles),
        geometry: geometry,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in calculate-route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
