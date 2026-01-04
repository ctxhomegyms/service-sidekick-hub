import { useState, useEffect } from 'react';
import { X, Plus, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Technician {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface CrewSelectorProps {
  value: string[];
  onChange: (technicianIds: string[]) => void;
}

export function CrewSelector({ value, onChange }: CrewSelectorProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechId, setSelectedTechId] = useState('');

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'technician');

    if (roles && roles.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', roles.map(r => r.user_id));
      if (data) setTechnicians(data);
    }
  };

  const handleAdd = () => {
    if (selectedTechId && !value.includes(selectedTechId)) {
      onChange([...value, selectedTechId]);
      setSelectedTechId('');
    }
  };

  const handleRemove = (techId: string) => {
    onChange(value.filter(id => id !== techId));
  };

  const handleSetPrimary = (techId: string) => {
    const newOrder = [techId, ...value.filter(id => id !== techId)];
    onChange(newOrder);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const availableTechnicians = technicians.filter(t => !value.includes(t.id));

  return (
    <div className="space-y-3">
      {/* Selected crew members */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((techId, index) => {
            const tech = technicians.find(t => t.id === techId);
            if (!tech) return null;
            
            return (
              <div 
                key={techId}
                className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={tech.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(tech.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm">{tech.full_name || 'Unknown'}</span>
                {index === 0 ? (
                  <span className="text-xs text-accent flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Primary
                  </span>
                ) : (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleSetPrimary(techId)}
                    className="text-xs h-6 px-2"
                  >
                    Set Primary
                  </Button>
                )}
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => handleRemove(techId)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add crew member */}
      {availableTechnicians.length > 0 && (
        <div className="flex gap-2">
          <Select value={selectedTechId} onValueChange={setSelectedTechId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add crew member" />
            </SelectTrigger>
            <SelectContent>
              {availableTechnicians.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.full_name || 'Unknown'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="icon" onClick={handleAdd} disabled={!selectedTechId}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {value.length === 0 && availableTechnicians.length === 0 && (
        <p className="text-sm text-muted-foreground">No technicians available</p>
      )}
    </div>
  );
}
