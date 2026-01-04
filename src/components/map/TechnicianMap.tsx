import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useTechnicianLocations } from '@/hooks/useTechnicianLocations';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Filter, Layers, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { renderMapJobCardHTML } from './MapJobCard';

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

interface MapStats {
  totalPins: number;
  techsOnline: number;
  enRouteCount: number;
  inProgressCount: number;
  lateJobs: number;
}

interface MapFilters {
  statuses: string[];
  priorities: string[];
  technicianIds: string[];
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

const ALL_STATUSES = ['pending', 'scheduled', 'en_route', 'in_progress'];
const ALL_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export interface TechnicianMapProps {
  onStatsChange?: (stats: MapStats) => void;
}

export const TechnicianMap: React.FC<TechnicianMapProps> = ({ onStatsChange }) => {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { locations, loading: locationsLoading } = useTechnicianLocations();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [mapboxTokenError, setMapboxTokenError] = useState<string | null>(null);
  const [trafficEnabled, setTrafficEnabled] = useState(false);
  const [filters, setFilters] = useState<MapFilters>({
    statuses: [...ALL_STATUSES],
    priorities: [...ALL_PRIORITIES],
    technicianIds: [],
  });

  // Calculate late jobs (ETA past time window end)
  const calculateLateJobs = useCallback((jobsList: Job[], routesList: RouteInfo[]): string[] => {
    const lateJobIds: string[] = [];
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    jobsList.forEach(job => {
      if (!job.time_window_end) return;
      
      const route = routesList.find(r => r.jobId === job.id);
      if (route) {
        // Calculate arrival time
        const arrivalDate = new Date(now.getTime() + route.durationMinutes * 60000);
        const arrivalTime = `${arrivalDate.getHours().toString().padStart(2, '0')}:${arrivalDate.getMinutes().toString().padStart(2, '0')}`;
        
        if (arrivalTime > job.time_window_end) {
          lateJobIds.push(job.id);
        }
      } else if (currentTime > job.time_window_end && job.status !== 'in_progress') {
        // No route and past time window
        lateJobIds.push(job.id);
      }
    });

    return lateJobIds;
  }, []);

  // Fetch Mapbox token from backend secrets
  useEffect(() => {
    const fetchToken = async () => {
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');

      const token = data?.token as string | undefined;

      if (token) {
        if (token.startsWith('sk.')) {
          setMapboxToken(null);
          setMapboxTokenError('Your Mapbox token is a secret token (sk.*). Map rendering requires a public token (pk.*).');
          return;
        }

        setMapboxToken(token);
        setMapboxTokenError(null);
      } else {
        console.error('Failed to fetch Mapbox token:', error);
        setMapboxToken(null);
        setMapboxTokenError('Mapbox token is not configured.');
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
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
    };
  }, []);

  // Update stats when data changes
  useEffect(() => {
    const lateJobIds = calculateLateJobs(jobs, routes);
    const filteredJobs = jobs.filter(job => 
      filters.statuses.includes(job.status) &&
      filters.priorities.includes(job.priority) &&
      (filters.technicianIds.length === 0 || 
        (job.assigned_technician_id && filters.technicianIds.includes(job.assigned_technician_id)))
    );

    const stats: MapStats = {
      totalPins: locations.length + filteredJobs.filter(j => j.latitude && j.longitude).length,
      techsOnline: locations.length,
      enRouteCount: jobs.filter(j => j.status === 'en_route').length,
      inProgressCount: jobs.filter(j => j.status === 'in_progress').length,
      lateJobs: lateJobIds.length,
    };

    onStatsChange?.(stats);
  }, [jobs, routes, locations, filters, calculateLateJobs, onStatsChange]);

  // Calculate routes between technicians and their assigned jobs
  const calculateRoutes = useCallback(async () => {
    if (locations.length === 0 || jobs.length === 0) return;

    const routePromises: Promise<RouteInfo | null>[] = [];

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

  // Calculate routes when locations or jobs change, and periodically refresh (every 30 seconds for more real-time ETAs)
  useEffect(() => {
    calculateRoutes();
    
    const interval = setInterval(calculateRoutes, 30000);
    return () => clearInterval(interval);
  }, [calculateRoutes]);

  // Initialize map
  useEffect(() => {
    if (mapboxTokenError) return;
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-122.4194, 37.7749],
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, mapboxTokenError]);

  // Toggle traffic layer
  useEffect(() => {
    if (!map.current) return;
    const currentMap = map.current;

    const updateTraffic = () => {
      try {
        if (trafficEnabled) {
          if (!currentMap.getSource('mapbox-traffic')) {
            currentMap.addSource('mapbox-traffic', {
              type: 'vector',
              url: 'mapbox://mapbox.mapbox-traffic-v1',
            });
          }
          if (!currentMap.getLayer('traffic-layer')) {
            currentMap.addLayer({
              id: 'traffic-layer',
              type: 'line',
              source: 'mapbox-traffic',
              'source-layer': 'traffic',
              paint: {
                'line-width': 2,
                'line-color': [
                  'match',
                  ['get', 'congestion'],
                  'low', '#10B981',
                  'moderate', '#F59E0B',
                  'heavy', '#EF4444',
                  'severe', '#991B1B',
                  '#6B7280'
                ],
                'line-opacity': 0.7,
              },
            });
          }
        } else {
          if (currentMap.getLayer('traffic-layer')) {
            currentMap.removeLayer('traffic-layer');
          }
          if (currentMap.getSource('mapbox-traffic')) {
            currentMap.removeSource('mapbox-traffic');
          }
        }
      } catch (e) {
        console.warn('Error toggling traffic layer:', e);
      }
    };

    if (currentMap.isStyleLoaded()) {
      updateTraffic();
    } else {
      currentMap.once('load', updateTraffic);
    }
  }, [trafficEnabled]);

  // Track added route source IDs for cleanup
  const routeSourcesRef = useRef<string[]>([]);

  // Update markers and routes when data changes
  useEffect(() => {
    if (!map.current) return;

    const currentMap = map.current;
    const lateJobIds = calculateLateJobs(jobs, routes);

    // Filter jobs based on current filters
    const filteredJobs = jobs.filter(job => 
      filters.statuses.includes(job.status) &&
      filters.priorities.includes(job.priority) &&
      (filters.technicianIds.length === 0 || 
        (job.assigned_technician_id && filters.technicianIds.includes(job.assigned_technician_id)))
    );

    const updateMapData = () => {
      try {
        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Clear existing route layers safely
        routeSourcesRef.current.forEach((sourceId) => {
          const outlineId = `${sourceId}-outline`;
          try {
            if (currentMap.getLayer(sourceId)) {
              currentMap.removeLayer(sourceId);
            }
            if (currentMap.getLayer(outlineId)) {
              currentMap.removeLayer(outlineId);
            }
            if (currentMap.getSource(sourceId)) {
              currentMap.removeSource(sourceId);
            }
          } catch (e) {
            console.warn('Error removing layer/source:', e);
          }
        });
        routeSourcesRef.current = [];

        // Add route lines with dashed animation for en_route jobs
        routes.forEach((route, idx) => {
          const job = filteredJobs.find(j => j.id === route.jobId);
          if (!job) return; // Skip routes for filtered-out jobs

          const sourceId = `route-${idx}`;
          const outlineId = `${sourceId}-outline`;
          const isEnRoute = job?.status === 'en_route';
          const isLate = lateJobIds.includes(route.jobId);
          
          try {
            currentMap.addSource(sourceId, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: route.geometry,
              },
            });

            currentMap.addLayer({
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

            currentMap.addLayer({
              id: sourceId,
              type: 'line',
              source: sourceId,
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': isLate ? '#EF4444' : (isEnRoute ? '#10B981' : '#8B5CF6'),
                'line-width': 4,
                'line-opacity': 0.9,
                'line-dasharray': isEnRoute ? [2, 1] : [1],
              },
            });

            routeSourcesRef.current.push(sourceId);

            // Add floating ETA label on the route midpoint
            if (route.geometry.coordinates.length > 0) {
              const midIdx = Math.floor(route.geometry.coordinates.length / 2);
              const midpoint = route.geometry.coordinates[midIdx];
              
              const etaEl = document.createElement('div');
              etaEl.className = 'eta-label';
              etaEl.innerHTML = `
                <div style="
                  background: ${isLate ? '#EF4444' : (isEnRoute ? '#10B981' : '#8B5CF6')};
                  color: white;
                  padding: 4px 8px;
                  border-radius: 12px;
                  font-size: 11px;
                  font-weight: 600;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  white-space: nowrap;
                  display: flex;
                  align-items: center;
                  gap: 4px;
                ">
                  <span>🚗</span>
                  <span>${route.durationMinutes} min</span>
                  <span style="opacity: 0.8; font-size: 10px;">(${route.distanceMiles} mi)</span>
                  ${isLate ? '<span>⚠️</span>' : ''}
                </div>
              `;

              const etaMarker = new mapboxgl.Marker({
                element: etaEl,
                anchor: 'center',
              })
                .setLngLat([midpoint[0], midpoint[1]])
                .addTo(currentMap);

              markersRef.current.push(etaMarker);
            }
          } catch (e) {
            console.warn('Error adding route layer:', e);
          }
        });

        // Add technician markers
        const filteredLocations = filters.technicianIds.length === 0 
          ? locations 
          : locations.filter(l => filters.technicianIds.includes(l.technician_id));

        filteredLocations.forEach(loc => {
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
            .addTo(currentMap);

          markersRef.current.push(marker);
        });

        // Add job markers
        filteredJobs.forEach(job => {
          if (!job.latitude || !job.longitude) return;

          const jobRoute = routes.find(r => r.jobId === job.id);
          const isLate = lateJobIds.includes(job.id);
          
          // Find technician name for this job
          const techLocation = locations.find(l => l.technician_id === job.assigned_technician_id);
          const technicianName = techLocation?.profile?.full_name || null;

          const el = document.createElement('div');
          el.className = 'job-marker';
          el.style.cursor = 'pointer';
          
          const color = isLate 
            ? '#EF4444' 
            : (job.status === 'pending' 
              ? PRIORITY_COLORS[job.priority] 
              : STATUS_COLORS[job.status]);
          
          el.innerHTML = `
            <div style="
              width: 28px;
              height: 28px;
              background: ${color};
              border-radius: 4px;
              border: 2px solid ${isLate ? '#991B1B' : 'white'};
              box-shadow: ${isLate ? '0 0 8px rgba(239, 68, 68, 0.5)' : '0 2px 6px rgba(0,0,0,0.25)'};
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
              transition: transform 0.15s ease;
            ">
              ${isLate ? `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
              ` : `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
                </svg>
              `}
            </div>
          `;

          // Hover effect
          el.addEventListener('mouseenter', () => {
            const innerDiv = el.querySelector('div');
            if (innerDiv) {
              innerDiv.style.transform = 'scale(1.15)';
            }
          });
          el.addEventListener('mouseleave', () => {
            const innerDiv = el.querySelector('div');
            if (innerDiv) {
              innerDiv.style.transform = 'scale(1)';
            }
          });

          // Click to navigate to job details
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            navigate(`/jobs/${job.id}`);
          });

          // Create popup with styled job card - shows on hover
          const popupHTML = renderMapJobCardHTML({
            job: {
              id: job.id,
              title: job.title,
              status: job.status,
              priority: job.priority,
              address: job.address,
              city: job.city,
              state: job.state,
              scheduled_time: job.scheduled_time,
              time_window_start: job.time_window_start,
              time_window_end: job.time_window_end,
              customer: job.customer,
            },
            eta: jobRoute ? {
              durationMinutes: jobRoute.durationMinutes,
              distanceMiles: jobRoute.distanceMiles,
            } : null,
            isLate,
            technicianName,
          });

          const popup = new mapboxgl.Popup({ 
            offset: 25,
            closeButton: false,
            closeOnClick: false,
            maxWidth: '300px',
          }).setHTML(popupHTML);

          // Show popup on hover
          el.addEventListener('mouseenter', () => {
            popup.setLngLat([job.longitude!, job.latitude!]).addTo(currentMap);
          });
          el.addEventListener('mouseleave', () => {
            popup.remove();
          });

          const marker = new mapboxgl.Marker(el)
            .setLngLat([job.longitude, job.latitude])
            .addTo(currentMap);

          markersRef.current.push(marker);
        });

        // Fit bounds to show all markers
        const allLocations = filters.technicianIds.length === 0 
          ? locations 
          : locations.filter(l => filters.technicianIds.includes(l.technician_id));
        
        if (allLocations.length > 0 || filteredJobs.some(j => j.latitude && j.longitude)) {
          const bounds = new mapboxgl.LngLatBounds();
          allLocations.forEach(loc => bounds.extend([loc.longitude, loc.latitude]));
          filteredJobs.forEach(job => {
            if (job.latitude && job.longitude) {
              bounds.extend([job.longitude, job.latitude]);
            }
          });
          
          if (!bounds.isEmpty()) {
            currentMap.fitBounds(bounds, { padding: 50, maxZoom: 14 });
          }
        }
      } catch (e) {
        console.error('Error updating map data:', e);
      }
    };

    if (currentMap.isStyleLoaded()) {
      updateMapData();
    } else {
      currentMap.once('load', updateMapData);
    }
  }, [locations, jobs, routes, filters, calculateLateJobs, navigate]);

  const toggleStatus = (status: string) => {
    setFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status],
    }));
  };

  const togglePriority = (priority: string) => {
    setFilters(prev => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter(p => p !== priority)
        : [...prev.priorities, priority],
    }));
  };

  const toggleTechnician = (techId: string) => {
    setFilters(prev => ({
      ...prev,
      technicianIds: prev.technicianIds.includes(techId)
        ? prev.technicianIds.filter(t => t !== techId)
        : [...prev.technicianIds, techId],
    }));
  };

  const lateJobIds = calculateLateJobs(jobs, routes);

  if (mapboxTokenError) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg p-6">
        <div className="max-w-md text-center space-y-2">
          <div className="text-sm font-semibold">Map token configuration error</div>
          <div className="text-sm text-muted-foreground">{mapboxTokenError}</div>
          <div className="text-xs text-muted-foreground">
            Update the <span className="font-mono">MAPBOX_PUBLIC_TOKEN</span> secret to a public token (<span className="font-mono">pk.*</span>).
          </div>
        </div>
      </div>
    );
  }

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
      
      {/* Filter Controls */}
      <div className="absolute top-4 right-16 flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="bg-background/95 backdrop-blur-sm shadow-lg">
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {(filters.statuses.length < ALL_STATUSES.length || 
                filters.priorities.length < ALL_PRIORITIES.length || 
                filters.technicianIds.length > 0) && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                  !
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            {ALL_STATUSES.map(status => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={filters.statuses.includes(status)}
                onCheckedChange={() => toggleStatus(status)}
              >
                <span className="flex items-center gap-2">
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: STATUS_COLORS[status] }}
                  />
                  {status.replace('_', ' ')}
                </span>
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Priority</DropdownMenuLabel>
            {ALL_PRIORITIES.map(priority => (
              <DropdownMenuCheckboxItem
                key={priority}
                checked={filters.priorities.includes(priority)}
                onCheckedChange={() => togglePriority(priority)}
              >
                <span className="flex items-center gap-2">
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: PRIORITY_COLORS[priority] }}
                  />
                  {priority}
                </span>
              </DropdownMenuCheckboxItem>
            ))}
            {locations.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Technicians</DropdownMenuLabel>
                {locations.map(loc => (
                  <DropdownMenuCheckboxItem
                    key={loc.technician_id}
                    checked={filters.technicianIds.length === 0 || filters.technicianIds.includes(loc.technician_id)}
                    onCheckedChange={() => toggleTechnician(loc.technician_id)}
                  >
                    {loc.profile?.full_name || 'Unknown'}
                  </DropdownMenuCheckboxItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={trafficEnabled ? "default" : "secondary"}
          size="sm"
          className={trafficEnabled ? "" : "bg-background/95 backdrop-blur-sm shadow-lg"}
          onClick={() => setTrafficEnabled(!trafficEnabled)}
        >
          <Layers className="h-4 w-4 mr-1" />
          Traffic
        </Button>
      </div>

      {/* Late Jobs Warning */}
      {lateJobIds.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">
            {lateJobIds.length} job{lateJobIds.length > 1 ? 's' : ''} running late
          </span>
        </div>
      )}
      
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
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded bg-destructive" />
            <span>Late / Warning</span>
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
