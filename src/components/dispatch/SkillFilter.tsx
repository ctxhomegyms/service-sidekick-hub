import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Skill {
  id: string;
  name: string;
  color: string;
}

interface SkillFilterProps {
  skills: Skill[];
  selectedSkills: string[];
  onSelectionChange: (skills: string[]) => void;
}

export function SkillFilter({ skills, selectedSkills, onSelectionChange }: SkillFilterProps) {
  const toggleSkill = (skillId: string) => {
    if (selectedSkills.includes(skillId)) {
      onSelectionChange(selectedSkills.filter(id => id !== skillId));
    } else {
      onSelectionChange([...selectedSkills, skillId]);
    }
  };

  if (skills.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">Filter by skill:</span>
      {skills.map((skill) => {
        const isSelected = selectedSkills.includes(skill.id);
        return (
          <Badge
            key={skill.id}
            variant={isSelected ? 'default' : 'outline'}
            className={cn(
              "cursor-pointer transition-colors",
              isSelected 
                ? "bg-accent text-accent-foreground hover:bg-accent/80" 
                : "hover:bg-accent/20"
            )}
            style={!isSelected ? { borderColor: skill.color, color: skill.color } : undefined}
            onClick={() => toggleSkill(skill.id)}
          >
            {skill.name}
          </Badge>
        );
      })}
      {selectedSkills.length > 0 && (
        <button
          onClick={() => onSelectionChange([])}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
