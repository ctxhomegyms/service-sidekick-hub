import { useState, useRef } from 'react';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
  jobId: string;
  photoType: 'before' | 'during' | 'after';
  onUploadComplete?: () => void;
}

export function PhotoUpload({ jobId, photoType, onUploadComplete }: PhotoUploadProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Prevent double upload
    if (isUploading) return;

    // Check online status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.warning('You are offline. Please try again when connected.');
      return;
    }

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    setIsUploading(true);
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${jobId}/${photoType}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('job-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('job-photos')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('job_photos')
        .insert({
          job_id: jobId,
          uploaded_by: user.id,
          photo_url: publicUrl,
          photo_type: photoType,
        });

      if (dbError) throw dbError;

      toast.success('Photo uploaded successfully');
      onUploadComplete?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const typeLabels = {
    before: 'Before',
    during: 'During',
    after: 'After',
  };

  return (
    <div className="flex-1 min-w-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full gap-1 px-2 h-10 active:scale-[0.98]"
      >
        {isUploading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="sr-only">Uploading...</span>
          </>
        ) : (
          <>
            <Camera className="w-4 h-4 shrink-0" />
            <span className="truncate text-xs">{typeLabels[photoType]}</span>
          </>
        )}
      </Button>
    </div>
  );
}

interface PhotoGalleryProps {
  jobId: string;
  photos: Array<{
    id: string;
    photo_url: string;
    photo_type: string;
    caption: string | null;
    created_at: string;
  }>;
  onDelete?: (photoId: string) => void;
  canDelete?: boolean;
}

export function PhotoGallery({ jobId, photos, onDelete, canDelete = false }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const groupedPhotos = {
    before: photos.filter(p => p.photo_type === 'before'),
    during: photos.filter(p => p.photo_type === 'during'),
    after: photos.filter(p => p.photo_type === 'after'),
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No photos yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {(['before', 'during', 'after'] as const).map((type) => (
          groupedPhotos[type].length > 0 && (
            <div key={type}>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {type}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {groupedPhotos[type].map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group"
                    onClick={() => setSelectedPhoto(photo.photo_url)}
                  >
                    <img
                      src={photo.photo_url}
                      alt={`${type} photo`}
                      className="w-full h-full object-cover"
                    />
                    {canDelete && onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(photo.id);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 text-white"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={selectedPhoto}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
}
