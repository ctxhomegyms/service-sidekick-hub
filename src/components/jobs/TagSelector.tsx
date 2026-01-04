import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  value: string[];
  onChange: (tagIds: string[]) => void;
}

export function TagSelector({ value, onChange }: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const { data } = await supabase
      .from('tags')
      .select('id, name, color')
      .order('name');
    if (data) setTags(data);
  };

  const handleAddTag = (tagId: string) => {
    if (!value.includes(tagId)) {
      onChange([...value, tagId]);
    }
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleRemoveTag = (tagId: string) => {
    onChange(value.filter(id => id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!searchQuery.trim()) return;

    setIsCreating(true);
    try {
      // Generate a random color
      const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const { data, error } = await supabase.from('tags').insert({
        name: searchQuery.trim(),
        color: randomColor,
      }).select('id').single();

      if (error) throw error;

      await fetchTags();
      handleAddTag(data.id);
      toast.success('Tag created');
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Tag already exists');
      } else {
        toast.error(error.message || 'Failed to create tag');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const selectedTags = tags.filter(t => value.includes(t.id));
  const filteredTags = tags.filter(t => 
    !value.includes(t.id) && 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const showCreateOption = searchQuery.trim() && 
    !tags.some(t => t.name.toLowerCase() === searchQuery.toLowerCase());

  return (
    <div className="space-y-3">
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge 
              key={tag.id}
              variant="secondary"
              className="gap-1 pr-1"
              style={{ backgroundColor: `${tag.color}20`, borderColor: tag.color }}
            >
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: tag.color }} 
              />
              {tag.name}
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 hover:bg-transparent"
                onClick={() => handleRemoveTag(tag.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Tag selector */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <Input
            placeholder="Search or create tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left text-sm"
                onClick={() => handleAddTag(tag.id)}
              >
                <span 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: tag.color }} 
                />
                {tag.name}
              </button>
            ))}
            {showCreateOption && (
              <button
                type="button"
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left text-sm text-accent"
                onClick={handleCreateTag}
                disabled={isCreating}
              >
                <Plus className="w-3 h-3" />
                Create "{searchQuery}"
              </button>
            )}
            {filteredTags.length === 0 && !showCreateOption && (
              <p className="text-sm text-muted-foreground p-2">No tags found</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
