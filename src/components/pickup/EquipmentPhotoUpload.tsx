import { useRef } from 'react';
import { Upload, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface EquipmentPhoto {
  id: string;
  file: File;
  preview: string;
}

interface EquipmentPhotoUploadProps {
  photos: EquipmentPhoto[];
  onChange: (photos: EquipmentPhoto[]) => void;
}

export function EquipmentPhotoUpload({ photos, onChange }: EquipmentPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const newPhotos = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    onChange([...photos, ...newPhotos]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (photo) {
      URL.revokeObjectURL(photo.preview);
    }
    onChange(photos.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
      />

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <img
                src={photo.preview}
                alt="Equipment"
                className="w-full h-24 object-cover rounded-md border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removePhoto(photo.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full h-20 flex flex-col gap-1 border-dashed"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-5 w-5" />
        <span className="text-sm">
          {photos.length === 0 ? 'Upload equipment photos' : 'Add more photos'}
        </span>
      </Button>

      {photos.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
