import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TechnicianMap } from '@/components/map/TechnicianMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Users, Briefcase, Navigation, AlertTriangle } from 'lucide-react';

interface MapStats {
  totalPins: number;
  techsOnline: number;
  enRouteCount: number;
  inProgressCount: number;
  lateJobs: number;
}

const Map = () => {
  const [stats, setStats] = useState<MapStats>({
    totalPins: 0,
    techsOnline: 0,
    enRouteCount: 0,
    inProgressCount: 0,
    lateJobs: 0,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Map</h1>
          <p className="text-muted-foreground">
            Real-time view of technician locations and active jobs
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Pins</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPins}</div>
              <p className="text-xs text-muted-foreground">On map</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Techs Online</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{stats.techsOnline}</div>
              <p className="text-xs text-muted-foreground">Currently tracking</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">En Route</CardTitle>
              <Navigation className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500">{stats.enRouteCount}</div>
              <p className="text-xs text-muted-foreground">Heading to jobs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Briefcase className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.inProgressCount}</div>
              <p className="text-xs text-muted-foreground">Active jobs</p>
            </CardContent>
          </Card>
          <Card className={stats.lateJobs > 0 ? 'border-destructive' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Late Jobs</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${stats.lateJobs > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.lateJobs > 0 ? 'text-destructive' : ''}`}>
                {stats.lateJobs}
              </div>
              <p className="text-xs text-muted-foreground">Past time window</p>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[600px]">
              <TechnicianMap onStatsChange={setStats} />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Map;
