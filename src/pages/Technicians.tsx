import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, Mail, Briefcase, MapPin, Calendar, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Skill {
  id: string;
  name: string;
  color: string | null;
}

interface Technician {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  job_count: number;
  todaysJobCount: number;
  isOnShift: boolean;
  skills: Skill[];
}

export default function Technicians() {
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [skillFilter, setSkillFilter] = useState<string>('all');

  useEffect(() => {
    fetchTechnicians();
    fetchAllSkills();
  }, []);

  const fetchAllSkills = async () => {
    const { data } = await supabase.from('skills').select('*');
    setAllSkills(data || []);
  };

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

      // Get today's jobs
      const today = new Date().toISOString().split('T')[0];
      const { data: todaysJobs } = await supabase
        .from('jobs')
        .select('assigned_technician_id')
        .in('assigned_technician_id', techIds)
        .eq('scheduled_date', today)
        .not('status', 'in', '("cancelled","completed")');

      const todayCountMap: Record<string, number> = {};
      todaysJobs?.forEach(job => {
        if (job.assigned_technician_id) {
          todayCountMap[job.assigned_technician_id] = (todayCountMap[job.assigned_technician_id] || 0) + 1;
        }
      });

      // Get shift status for each technician
      const { data: locations } = await supabase
        .from('technician_locations')
        .select('technician_id, is_on_shift')
        .in('technician_id', techIds);

      const shiftMap: Record<string, boolean> = {};
      locations?.forEach(loc => {
        shiftMap[loc.technician_id] = loc.is_on_shift;
      });

      // Get skills for each technician
      const { data: techSkills } = await supabase
        .from('technician_skills')
        .select('technician_id, skill_id')
        .in('technician_id', techIds);

      const skillIds = [...new Set(techSkills?.map(ts => ts.skill_id) || [])];
      const { data: skillsData } = await supabase
        .from('skills')
        .select('*')
        .in('id', skillIds);

      const skillsMap: Record<string, Skill> = {};
      skillsData?.forEach(s => {
        skillsMap[s.id] = s;
      });

      const techSkillsMap: Record<string, Skill[]> = {};
      techSkills?.forEach(ts => {
        if (!techSkillsMap[ts.technician_id]) {
          techSkillsMap[ts.technician_id] = [];
        }
        if (skillsMap[ts.skill_id]) {
          techSkillsMap[ts.technician_id].push(skillsMap[ts.skill_id]);
        }
      });

      const technicianData: Technician[] = profiles?.map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        avatar_url: p.avatar_url,
        job_count: countMap[p.id] || 0,
        todaysJobCount: todayCountMap[p.id] || 0,
        isOnShift: shiftMap[p.id] || false,
        skills: techSkillsMap[p.id] || [],
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

  const filteredTechnicians = technicians.filter(tech => {
    const matchesSearch = tech.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesShift = shiftFilter === 'all' || 
      (shiftFilter === 'on' && tech.isOnShift) || 
      (shiftFilter === 'off' && !tech.isOnShift);
    
    const matchesSkill = skillFilter === 'all' || 
      tech.skills.some(s => s.id === skillFilter);
    
    return matchesSearch && matchesShift && matchesSkill;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Technicians</h1>
          <p className="text-muted-foreground">View and manage your field technicians</p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search technicians..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 items-center">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={shiftFilter} onValueChange={setShiftFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Shift Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="on">On Shift</SelectItem>
                <SelectItem value="off">Off Shift</SelectItem>
              </SelectContent>
            </Select>
            {allSkills.length > 0 && (
              <Select value={skillFilter} onValueChange={setSkillFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by Skill" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Skills</SelectItem>
                  {allSkills.map(skill => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {skill.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Technicians Grid */}
        {filteredTechnicians.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTechnicians.map((tech) => (
              <Card 
                key={tech.id} 
                className="animate-fade-in hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/technicians/${tech.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="w-14 h-14">
                        <AvatarImage src={tech.avatar_url || undefined} />
                        <AvatarFallback className="bg-accent text-accent-foreground text-lg">
                          {getInitials(tech.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      {tech.isOnShift && (
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{tech.full_name || 'Unknown'}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary">Technician</Badge>
                        {tech.isOnShift ? (
                          <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">
                            On Shift
                          </Badge>
                        ) : (
                          <Badge variant="outline">Off</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {/* Skills */}
                  {tech.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tech.skills.slice(0, 3).map(skill => (
                        <Badge
                          key={skill.id}
                          variant="outline"
                          className="text-xs"
                          style={{ 
                            backgroundColor: `${skill.color}15`, 
                            color: skill.color || undefined,
                            borderColor: skill.color || undefined
                          }}
                        >
                          {skill.name}
                        </Badge>
                      ))}
                      {tech.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{tech.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tech.email}</span>
                  </div>
                  {tech.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4 shrink-0" />
                      <span>{tech.phone}</span>
                    </div>
                  )}
                  
                  {/* Stats Row */}
                  <div className="flex items-center justify-between gap-2 text-sm pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{tech.job_count} jobs</span>
                    </div>
                    {tech.todaysJobCount > 0 && (
                      <div className="flex items-center gap-1 text-primary">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">{tech.todaysJobCount} today</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || shiftFilter !== 'all' || skillFilter !== 'all' 
                ? 'No technicians match your filters' 
                : 'No technicians yet. Users with the technician role will appear here.'}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
