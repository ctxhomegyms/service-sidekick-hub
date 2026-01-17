import { useState, useEffect } from 'react';
import { Package, Building2, ArrowUpDown, DoorOpen, CreditCard, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DoorWidth {
  door_name: string;
  width_inches: number;
}

interface PickupRequest {
  id: string;
  items_description: string;
  item_location: string;
  floor_level: string;
  has_elevator: boolean;
  has_stairs: boolean;
  stairs_description: string | null;
  door_widths: DoorWidth[];
  preferred_payment_method: string;
  payment_username: string;
}

interface PickupDetailsCardProps {
  jobId: string;
}

export function PickupDetailsCard({ jobId }: PickupDetailsCardProps) {
  const [pickupRequest, setPickupRequest] = useState<PickupRequest | null>(null);
  const [attachments, setAttachments] = useState<Array<{
    id: string;
    file_name: string;
    file_url: string;
    description: string | null;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchPickupDetails();
  }, [jobId]);

  const fetchPickupDetails = async () => {
    try {
      const [pickupResult, attachmentsResult] = await Promise.all([
        supabase
          .from('pickup_requests')
          .select('*')
          .eq('job_id', jobId)
          .maybeSingle(),
        supabase
          .from('job_attachments')
          .select('id, file_name, file_url, description')
          .eq('job_id', jobId)
      ]);

      if (pickupResult.data) {
        const rawDoorWidths = pickupResult.data.door_widths;
        const doorWidths: DoorWidth[] = Array.isArray(rawDoorWidths) 
          ? rawDoorWidths.map((d: unknown) => {
              const item = d as Record<string, unknown>;
              return {
                door_name: String(item.door_name || ''),
                width_inches: Number(item.width_inches || 0),
              };
            })
          : [];
        setPickupRequest({
          ...pickupResult.data,
          door_widths: doorWidths,
        });
      }

      if (attachmentsResult.data) {
        setAttachments(attachmentsResult.data);
      }
    } catch (error) {
      console.error('Error fetching pickup details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFloorLevel = (level: string) => {
    const levels: Record<string, string> = {
      'first_floor': 'First Floor',
      'second_floor': 'Second Floor',
      'third_floor_plus': 'Third Floor+',
      'basement': 'Basement',
    };
    return levels[level] || level;
  };

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      'venmo': 'Venmo',
      'paypal': 'PayPal',
      'check': 'Business Check',
    };
    return methods[method] || method;
  };

  if (isLoading || !pickupRequest) {
    return null;
  }

  const doorPhotos = attachments.filter(a => 
    a.file_name.toLowerCase().includes('door:') || 
    a.description?.toLowerCase().includes('door measurement')
  );
  const equipmentPhotos = attachments.filter(a => 
    a.description?.toLowerCase().includes('equipment photo') ||
    a.file_name.toLowerCase().includes('equipment')
  );

  return (
    <>
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5 text-orange-600" />
            Pickup Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Items Description */}
          <div>
            <h4 className="text-sm font-medium mb-1 text-muted-foreground">Items for Pickup</h4>
            <p className="text-sm whitespace-pre-wrap bg-background/50 p-3 rounded-md border">
              {pickupRequest.items_description}
            </p>
          </div>

          {/* Item Location */}
          <div>
            <h4 className="text-sm font-medium mb-1 text-muted-foreground">Item Location</h4>
            <p className="text-sm">{pickupRequest.item_location}</p>
          </div>

          {/* Access Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                Floor Level
              </h4>
              <Badge variant="secondary">{formatFloorLevel(pickupRequest.floor_level)}</Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1 text-muted-foreground">
                <ArrowUpDown className="w-4 h-4" />
                Access
              </h4>
              <div className="flex flex-wrap gap-1">
                {pickupRequest.has_elevator && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Elevator
                  </Badge>
                )}
                {pickupRequest.has_stairs && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    Stairs
                  </Badge>
                )}
                {!pickupRequest.has_elevator && !pickupRequest.has_stairs && (
                  <Badge variant="outline">Ground Level</Badge>
                )}
              </div>
            </div>
          </div>

          {pickupRequest.stairs_description && (
            <div>
              <h4 className="text-sm font-medium mb-1 text-muted-foreground">Stairs Description</h4>
              <p className="text-sm">{pickupRequest.stairs_description}</p>
            </div>
          )}

          {/* Door Widths */}
          {pickupRequest.door_widths.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1 text-muted-foreground">
                <DoorOpen className="w-4 h-4" />
                Door Measurements
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {pickupRequest.door_widths.map((door, index) => (
                  <div key={index} className="flex items-center justify-between bg-background/50 p-2 rounded-md border">
                    <span className="text-sm">{door.door_name}</span>
                    <Badge variant="secondary">{door.width_inches}"</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Door Photos */}
          {doorPhotos.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1 text-muted-foreground">
                <ImageIcon className="w-4 h-4" />
                Door Photos
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {doorPhotos.map((photo) => (
                  <div 
                    key={photo.id} 
                    className="relative aspect-square rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedImage(photo.file_url)}
                  >
                    <img 
                      src={photo.file_url} 
                      alt={photo.file_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 truncate">
                      {photo.file_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equipment Photos */}
          {equipmentPhotos.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1 text-muted-foreground">
                <Package className="w-4 h-4" />
                Equipment Photos
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {equipmentPhotos.map((photo) => (
                  <div 
                    key={photo.id} 
                    className="relative aspect-square rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedImage(photo.file_url)}
                  >
                    <img 
                      src={photo.file_url} 
                      alt={photo.file_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1 text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              Payment Preference
            </h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{formatPaymentMethod(pickupRequest.preferred_payment_method)}</Badge>
              <span className="text-sm font-medium">{pickupRequest.payment_username}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Photo</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="Full size" 
              className="w-full h-auto rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
