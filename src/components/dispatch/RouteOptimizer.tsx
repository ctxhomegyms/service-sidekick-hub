import { useState } from 'react';
import { Route, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useRouteOptimization } from '@/hooks/useRouteOptimization';
import { toast } from 'sonner';

interface Job {
  id: string;
  title: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  city?: string | null;
  scheduled_date?: string | null;
  assigned_technician_id?: string | null;
}

interface Technician {
  id: string;
  full_name: string | null;
}

interface TechnicianLocation {
  technician_id: string;
  latitude: number;
  longitude: number;
}

interface RouteOptimizerProps {
  jobs: Job[];
  technicians: Technician[];
  technicianLocations?: TechnicianLocation[];
  selectedDate?: string;
  onOptimize: (technicianId: string, optimizedJobIds: string[]) => void;
}

export function RouteOptimizer({
  jobs,
  technicians,
  technicianLocations = [],
  selectedDate,
  onOptimize,
}: RouteOptimizerProps) {
  const [open, setOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const { optimizeRoute, isOptimizing, error } = useRouteOptimization();

  // Get jobs for selected technician on selected date with coordinates
  const eligibleJobs = jobs.filter(job => {
    const hasCoords = job.latitude && job.longitude;
    const matchesTech = job.assigned_technician_id === selectedTechnician;
    const matchesDate = !selectedDate || job.scheduled_date === selectedDate;
    return hasCoords && matchesTech && matchesDate;
  });

  // Get technician's current location if available
  const techLocation = technicianLocations.find(
    loc => loc.technician_id === selectedTechnician
  );

  const handleOptimize = async () => {
    if (!selectedTechnician || eligibleJobs.length < 2) {
      toast.error('Select a technician with at least 2 jobs that have addresses');
      return;
    }

    const locations = eligibleJobs.map(job => ({
      id: job.id,
      latitude: job.latitude!,
      longitude: job.longitude!,
    }));

    const startLocation = techLocation ? {
      latitude: techLocation.latitude,
      longitude: techLocation.longitude,
    } : undefined;

    const result = await optimizeRoute(locations, startLocation);

    if (result) {
      toast.success(
        `Route optimized! Total: ${result.total_duration_minutes} min, ${result.total_distance_miles} mi`
      );
      onOptimize(selectedTechnician, result.optimized_order);
      setOpen(false);
    } else if (error) {
      toast.error(error);
    }
  };

  const selectedTechName = technicians.find(t => t.id === selectedTechnician)?.full_name || '';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Route className="w-4 h-4 mr-2" />
          Optimize Route
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Optimize Driving Route</DialogTitle>
          <DialogDescription>
            Automatically reorder jobs for the most efficient driving route.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="technician">Technician</Label>
            <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
              <SelectTrigger>
                <SelectValue placeholder="Select technician" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map(tech => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.full_name || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTechnician && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Jobs to optimize</Label>
                <Badge variant="secondary">{eligibleJobs.length}</Badge>
              </div>
              
              {eligibleJobs.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  No jobs with addresses found for {selectedTechName}
                </div>
              ) : eligibleJobs.length === 1 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  Need at least 2 jobs to optimize
                </div>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {eligibleJobs.map((job, index) => (
                    <div 
                      key={job.id} 
                      className="text-sm p-2 bg-muted rounded flex items-center gap-2"
                    >
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <span className="truncate flex-1">{job.title}</span>
                      <span className="text-muted-foreground text-xs truncate max-w-[100px]">
                        {job.city || job.address}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {techLocation && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3 h-3 text-green-500" />
                  Will start from technician's current location
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleOptimize} 
            disabled={isOptimizing || eligibleJobs.length < 2}
          >
            {isOptimizing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Route className="w-4 h-4 mr-2" />
                Optimize
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
