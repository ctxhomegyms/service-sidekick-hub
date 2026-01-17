import { useRef } from 'react';
import { Plus, X, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface DoorMeasurement {
  id: string;
  door_name: string;
  width_inches: number;
  photo: File | null;
  photoPreview?: string;
}

interface DoorMeasurementsInputProps {
  measurements: DoorMeasurement[];
  onChange: (measurements: DoorMeasurement[]) => void;
}

export function DoorMeasurementsInput({ measurements, onChange }: DoorMeasurementsInputProps) {
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const addDoor = () => {
    const newId = Date.now().toString();
    onChange([
      ...measurements,
      { id: newId, door_name: '', width_inches: 0, photo: null },
    ]);
  };

  const removeDoor = (id: string) => {
    if (measurements.length > 1) {
      const measurement = measurements.find(m => m.id === id);
      if (measurement?.photoPreview) {
        URL.revokeObjectURL(measurement.photoPreview);
      }
      onChange(measurements.filter(m => m.id !== id));
    }
  };

  const updateDoor = (id: string, field: keyof DoorMeasurement, value: any) => {
    onChange(
      measurements.map(m =>
        m.id === id ? { ...m, [field]: value } : m
      )
    );
  };

  const handlePhotoChange = (id: string, file: File | null) => {
    const measurement = measurements.find(m => m.id === id);
    if (measurement?.photoPreview) {
      URL.revokeObjectURL(measurement.photoPreview);
    }

    onChange(
      measurements.map(m =>
        m.id === id
          ? {
              ...m,
              photo: file,
              photoPreview: file ? URL.createObjectURL(file) : undefined,
            }
          : m
      )
    );
  };

  return (
    <div className="space-y-4">
      {measurements.map((measurement, index) => (
        <div
          key={measurement.id}
          className="border rounded-lg p-4 space-y-3 relative bg-card"
        >
          {measurements.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => removeDoor(measurement.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          <div className="text-sm font-medium text-muted-foreground">
            Door {index + 1}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`door-name-${measurement.id}`} className="text-xs">
                Door Location/Name
              </Label>
              <Input
                id={`door-name-${measurement.id}`}
                placeholder="e.g., Front door"
                value={measurement.door_name}
                onChange={(e) => updateDoor(measurement.id, 'door_name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`door-width-${measurement.id}`} className="text-xs">
                Width (inches)
              </Label>
              <Input
                id={`door-width-${measurement.id}`}
                type="number"
                placeholder="36"
                value={measurement.width_inches || ''}
                onChange={(e) => updateDoor(measurement.id, 'width_inches', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Door Photo</Label>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={(el) => (fileInputRefs.current[measurement.id] = el)}
              onChange={(e) => handlePhotoChange(measurement.id, e.target.files?.[0] || null)}
            />
            
            {measurement.photoPreview ? (
              <div className="relative mt-1">
                <img
                  src={measurement.photoPreview}
                  alt={`Door ${index + 1}`}
                  className="w-full h-24 object-cover rounded-md"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => handlePhotoChange(measurement.id, null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full mt-1 h-24 flex flex-col gap-1"
                onClick={() => fileInputRefs.current[measurement.id]?.click()}
              >
                <Upload className="h-5 w-5" />
                <span className="text-xs">Upload door photo</span>
              </Button>
            )}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={addDoor}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Another Door
      </Button>
    </div>
  );
}
