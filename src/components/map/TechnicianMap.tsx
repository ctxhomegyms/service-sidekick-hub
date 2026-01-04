import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useTechnicianLocations } from '@/hooks/useTechnicianLocations';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  status: string;
  priority: string;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  assigned_technician_id: string | null;
  scheduled_time: string | null;
  time_window_start: string | null;
  time_window_end: string | null;
  customer?: {
    name: string;
  };
}

interface RouteInfo {
  technicianId: string;
  jobId: string;
  durationMinutes: number;
  distanceMiles: number;
  geometry: GeoJSON.LineString;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  scheduled: '#3B82F6',
  en_route: '#8B5CF6',
  in_progress: '#10B981',
  completed: '#6B7280',
  cancelled: '#EF4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#6B7280',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

export const TechnicianMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { locations, loading: locationsLoading } = useTechnicianLocations();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // Fetch Mapbox token from edge function secrets
  useEffect(() => {
    const fetchToken = async () => {
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      if (data?.token) {
        setMapboxToken(data.token);
      } else {
        console.error('Failed to fetch Mapbox token:', error);
      }
    };
    fetchToken();
  }, []);

  // Fetch jobs with locations
  useEffect(() => {
    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id, title, status, priority, address, city, state,
          latitude, longitude, assigned_technician_id,
          scheduled_time, time_window_start, time_window_end,
          customer:customers(name)
        `)
        .in('status', ['pending', 'scheduled', 'en_route', 'in_progress']);

      if (error) {
        console.error('Error fetching jobs:', error);
      } else {
        const jobsData = (data || []).map((job) => ({
          ...job,
          customer: Array.isArray(job.customer) ? job.customer[0] : job.customer,
        }));
        setJobs(jobsData);
      }
      setLoading(false);
    };

    fetchJobs();

    // Subscribe to real-time job updates
    const jobChannel = supabase
      .channel('job-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
        },
        () => {
          // Refetch jobs on any change
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
    };
  }, []);

  // Calculate routes between technicians and their assigned jobs
  const calculateRoutes = useCallback(async () => {
    if (locations.length === 0 || jobs.length === 0) return;

    const routePromises: Promise<RouteInfo | null>[] = [];

    // For each job that is en_route or in_progress, calculate route from assigned technician
    for (const job of jobs) {
      if (!job.assigned_technician_id || !job.latitude || !job.longitude) continue;
      if (job.status !== 'en_route' && job.status !== 'scheduled') continue;

      const techLocation = locations.find(l => l.technician_id === job.assigned_technician_id);
      if (!techLocation) continue;

      const routePromise = (async (): Promise<RouteInfo | null> => {
        try {
          const { data, error } = await supabase.functions.invoke('calculate-route', {
            body: {
              origin: { latitude: techLocation.latitude, longitude: techLocation.longitude },
              destination: { latitude: job.latitude, longitude: job.longitude }
            }
          });

          if (error || data.error) return null;

          return {
            technicianId: techLocation.technician_id,
            jobId: job.id,
            durationMinutes: data.duration_minutes,
            distanceMiles: data.distance_miles,
            geometry: data.geometry,
          };
        } catch {
          return null;
        }
      })();

      routePromises.push(routePromise);
    }

    const results = await Promise.all(routePromises);
    setRoutes(results.filter((r): r is RouteInfo => r !== null));
  }, [locations, jobs]);

  // Calculate routes when locations or jobs change, and periodically refresh
  useEffect(() => {
    calculateRoutes();
    
    // Refresh routes every 60 seconds for live ETA updates
    const interval = setInterval(calculateRoutes, 60000);
    return () => clearInterval(interval);
  }, [calculateRoutes]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-122.4194, 37.7749], // SF default
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Update markers and routes when data changes
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Clear existing route layers
    routes.forEach((_, idx) => {
      const sourceId = `route-${idx}`;
      const outlineId = `route-outline-${idx}`;
      if (map.current?.getLayer(sourceId)) {
        map.current.removeLayer(sourceId);
      }
      if (map.current?.getLayer(outlineId)) {
        map.current.removeLayer(outlineId);
      }
      if (map.current?.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    });

    // Add route lines with dashed animation for en_route jobs
    routes.forEach((route, idx) => {
      if (!map.current) return;
      
      const sourceId = `route-${idx}`;
      const outlineId = `route-outline-${idx}`;
      
      // Find if this route's job is en_route
      const job = jobs.find(j => j.id === route.jobId);
      const isEnRoute = job?.status === 'en_route';
      
      // Add route source and layers
      if (!map.current.getSource(sourceId)) {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route.geometry,
          },
        });

        // Outline layer for better visibility
        map.current.addLayer({
          id: outlineId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#ffffff',
            'line-width': 7,
            'line-opacity': 0.8,
          },
        });

        // Main route layer
        map.current.addLayer({
          id: sourceId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': isEnRoute ? '#10B981' : '#8B5CF6',
            'line-width': 4,
            'line-opacity': 0.9,
            'line-dasharray': isEnRoute ? [2, 1] : [1],
          },
        });
      }
    });

    // Add technician markers
    locations.forEach(loc => {
      // Find route for this technician to show ETA
      const techRoute = routes.find(r => r.technicianId === loc.technician_id);
      const etaText = techRoute 
        ? `<br/><span style="font-size: 11px; color: #8B5CF6;">📍 ETA to job: ${techRoute.durationMinutes} min (${techRoute.distanceMiles} mi)</span>`
        : '';

      const el = document.createElement('div');
      el.className = 'technician-marker';
      el.innerHTML = `
        <div style="
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, hsl(173, 58%, 39%), hsl(173, 58%, 49%));
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
        ">
          ${loc.profile?.full_name?.charAt(0) || 'T'}
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px;">
          <strong>${loc.profile?.full_name || 'Technician'}</strong>
          <br/>
          <span style="color: #10B981; font-size: 12px;">● On Shift</span>
          ${etaText}
          <br/>
          <span style="font-size: 11px; color: #666;">
            Updated: ${new Date(loc.updated_at).toLocaleTimeString()}
          </span>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([loc.longitude, loc.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Add job markers
    jobs.forEach(job => {
      if (!job.latitude || !job.longitude) return;

      // Find route for this job to show ETA
      const jobRoute = routes.find(r => r.jobId === job.id);
      const etaText = jobRoute 
        ? `<br/><span style="font-size: 11px; color: #8B5CF6; margin-top: 4px; display: block;">🚗 Tech arriving in ~${jobRoute.durationMinutes} min</span>`
        : '';

      // Time window display
      const timeWindowText = job.time_window_start && job.time_window_end
        ? `<br/><span style="font-size: 11px; color: #666;">⏰ Window: ${job.time_window_start.slice(0, 5)} - ${job.time_window_end.slice(0, 5)}</span>`
        : '';

      const scheduledTimeText = job.scheduled_time
        ? `<br/><span style="font-size: 11px; color: #666;">📅 Scheduled: ${job.scheduled_time.slice(0, 5)}</span>`
        : '';

      const el = document.createElement('div');
      el.className = 'job-marker';
      const color = job.status === 'pending' 
        ? PRIORITY_COLORS[job.priority] 
        : STATUS_COLORS[job.status];
      
      el.innerHTML = `
        <div style="
          width: 28px;
          height: 28px;
          background: ${color};
          border-radius: 4px;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
          </svg>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; min-width: 150px;">
          <strong>${job.title}</strong>
          <br/>
          <span style="font-size: 12px; color: #666;">
            ${job.customer?.name || 'No customer'}
          </span>
          <br/>
          <span style="
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            background: ${color}20;
            color: ${color};
            margin-top: 4px;
          ">
            ${job.status.replace('_', ' ')}
          </span>
          ${scheduledTimeText}
          ${timeWindowText}
          ${etaText}
          ${job.address ? `<br/><span style="font-size: 11px; color: #888;">${job.address}</span>` : ''}
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([job.longitude, job.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (markersRef.current.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      locations.forEach(loc => bounds.extend([loc.longitude, loc.latitude]));
      jobs.forEach(job => {
        if (job.latitude && job.longitude) {
          bounds.extend([job.longitude, job.latitude]);
        }
      });
      
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      }
    }
  }, [locations, jobs, routes]);

  if (loading || locationsLoading || !mapboxToken) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
        <div className="text-xs font-medium mb-2">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-accent" />
            <span>Technician</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded bg-warning" />
            <span>Pending Job</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span>Scheduled</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded bg-success" />
            <span>In Progress</span>
          </div>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Techs Online:</span>
            <span className="ml-1 font-semibold text-accent">{locations.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Active Jobs:</span>
            <span className="ml-1 font-semibold text-primary">{jobs.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
