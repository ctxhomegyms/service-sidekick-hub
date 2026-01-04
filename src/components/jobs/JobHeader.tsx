import { useState } from 'react';
import { format } from 'date-fns';
import { MapPin, Tag, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { TagSelector } from './TagSelector';
import { supabase } from '@/integrations/supabase/client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface JobHeaderProps {
  job: {
    id: string;
    job_number: string | null;
    title: string;
    status: string;
    priority: string;
    created_at: string;
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    city: string | null;
    state: string | null;
    job_type: { id: string; name: string; color: string | null } | null;
    created_by?: string | null;
    tags: Array<{ tag: { id: string; name: string; color: string | null } }>;
  };
  onUpdate: () => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export function JobHeader({ job, onUpdate }: JobHeaderProps) {
  const [isTagOpen, setIsTagOpen] = useState(false);
  const selectedTagIds = job.tags.map(t => t.tag.id);

  const handleTagsChange = async (newTagIds: string[]) => {
    try {
      // Remove tags that are no longer selected
      const tagsToRemove = selectedTagIds.filter(id => !newTagIds.includes(id));
      for (const tagId of tagsToRemove) {
        await supabase
          .from('job_tags')
          .delete()
          .eq('job_id', job.id)
          .eq('tag_id', tagId);
      }

      // Add new tags
      const tagsToAdd = newTagIds.filter(id => !selectedTagIds.includes(id));
      for (const tagId of tagsToAdd) {
        await supabase
          .from('job_tags')
          .insert({ job_id: job.id, tag_id: tagId });
      }

      onUpdate();
    } catch (error) {
      console.error('Error updating tags:', error);
    }
  };

  const mapUrl = job.latitude && job.longitude
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ef4444(${job.longitude},${job.latitude})/${job.longitude},${job.latitude},14,0/800x200@2x?access_token=pk.placeholder`
    : null;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Map Header Background */}
      <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/10 relative">
        {job.address && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-5 h-5" />
              <span className="text-sm">
                {job.address}{job.city ? `, ${job.city}` : ''}{job.state ? `, ${job.state}` : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Job Info */}
      <div className="p-6 space-y-4">
        {/* Title Row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              {job.job_number && <span className="font-mono">{job.job_number}</span>}
              {job.job_type && (
                <>
                  <span>:</span>
                  <span>{job.job_type.name}</span>
                </>
              )}
            </div>
            <h1 className="text-2xl font-bold">{job.title}</h1>
          </div>

          <Popover open={isTagOpen} onOpenChange={setIsTagOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Tag className="w-4 h-4" />
                Add Tags
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <TagSelector 
                value={selectedTagIds}
                onChange={(tags) => {
                  handleTagsChange(tags);
                  setIsTagOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Tags */}
        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {job.tags.map(({ tag }) => (
              <Badge
                key={tag.id}
                variant="secondary"
                style={{ 
                  backgroundColor: tag.color ? `${tag.color}20` : undefined,
                  color: tag.color || undefined,
                  borderColor: tag.color || undefined
                }}
                className="border"
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Metadata Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Job Type</p>
            <p className="font-medium">{job.job_type?.name || 'Not set'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Priority</p>
            <Badge className={priorityColors[job.priority] || priorityColors.medium}>
              {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Created At</p>
            <p className="font-medium">{format(new Date(job.created_at), 'dd MMM yyyy, hh:mm a')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Created</p>
            <p className="font-medium">{format(new Date(job.created_at), 'dd MMM yyyy')}</p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <span className="text-sm text-muted-foreground">Status:</span>
          <StatusBadge status={job.status as any} />
        </div>
      </div>
    </div>
  );
}
