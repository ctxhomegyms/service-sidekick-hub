import { useState, useEffect } from 'react';
import { Search, Phone, Mail, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Technician {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  job_count: number;
}

export default function Technicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    try {
      // Get all technician user IDs
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'technician');

      if (!roles?.length) {
        setTechnicians([]);
        return;
      }

      const techIds = roles.map(r => r.user_id);

      // Get profiles for technicians
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', techIds);

      // Get job counts for each technician
      const { data: jobCounts } = await supabase
        .from('jobs')
        .select('assigned_technician_id')
        .in('assigned_technician_id', techIds)
        .neq('status', 'cancelled');

      const countMap: Record<string, number> = {};
      jobCounts?.forEach(job => {
        if (job.assigned_technician_id) {
          countMap[job.assigned_technician_id] = (countMap[job.assigned_technician_id] || 0) + 1;
        }
      });

      const technicianData = profiles?.map(p => ({
        ...p,
        job_count: countMap[p.id] || 0,
      })) || [];

      setTechnicians(technicianData);
    } catch (error) {
      console.error('Error fetching technicians:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredTechnicians = technicians.filter(tech =>
    tech.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tech.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Technicians</h1>
          <p className="text-muted-foreground">View and manage your field technicians</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search technicians..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Technicians Grid */}
        {filteredTechnicians.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTechnicians.map((tech) => (
              <Card key={tech.id} className="animate-fade-in hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={tech.avatar_url || undefined} />
                      <AvatarFallback className="bg-accent text-accent-foreground text-lg">
                        {getInitials(tech.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{tech.full_name || 'Unknown'}</h3>
                      <Badge variant="secondary" className="mt-1">
                        Technician
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 shrink-0" />
                    <a href={`mailto:${tech.email}`} className="hover:text-foreground truncate">
                      {tech.email}
                    </a>
                  </div>
                  {tech.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4 shrink-0" />
                      <a href={`tel:${tech.phone}`} className="hover:text-foreground">
                        {tech.phone}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm pt-2 border-t">
                    <Briefcase className="w-4 h-4 text-accent" />
                    <span className="font-medium">{tech.job_count} assigned jobs</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? 'No technicians match your search' : 'No technicians yet. Users with the technician role will appear here.'}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
