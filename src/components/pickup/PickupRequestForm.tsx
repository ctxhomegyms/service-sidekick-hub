import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FloorAccessInput } from './FloorAccessInput';
import { DoorMeasurementsInput, DoorMeasurement } from './DoorMeasurementsInput';
import { EquipmentPhotoUpload, EquipmentPhoto } from './EquipmentPhotoUpload';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  sms_consent: z.boolean().default(false),
  confirm_selling: z.boolean().refine(val => val === true, {
    message: 'Please confirm you are selling equipment',
  }),
  items_description: z.string().min(1, 'Please list your items'),
  item_location: z.string().min(1, 'Please describe where items are located'),
  floor_level: z.string().min(1, 'Please select floor level'),
  has_elevator: z.boolean().default(false),
  has_stairs: z.boolean().default(false),
  stairs_description: z.string().optional(),
  address: z.string().min(1, 'Street address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip_code: z.string().min(1, 'ZIP code is required'),
  country: z.string().default('USA'),
  preferred_payment_method: z.string().min(1, 'Please select payment method'),
  payment_username: z.string().min(1, 'Payment username/make-to is required'),
});

type FormData = z.infer<typeof formSchema>;

interface PickupRequestFormProps {
  onSuccess: () => void;
}

export function PickupRequestForm({ onSuccess }: PickupRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doorMeasurements, setDoorMeasurements] = useState<DoorMeasurement[]>([
    { id: '1', door_name: '', width_inches: 0, photo: null },
  ]);
  const [equipmentPhotos, setEquipmentPhotos] = useState<EquipmentPhoto[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      sms_consent: false,
      confirm_selling: false,
      items_description: '',
      item_location: '',
      floor_level: '',
      has_elevator: false,
      has_stairs: false,
      stairs_description: '',
      address: '',
      address2: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'USA',
      preferred_payment_method: '',
      payment_username: '',
    },
  });

  const hasStairs = form.watch('has_stairs');

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const onSubmit = async (data: FormData) => {
    // Validate equipment photos
    if (equipmentPhotos.length === 0) {
      toast.error('Please upload at least one equipment photo');
      return;
    }

    // Validate door measurements
    const validDoors = doorMeasurements.filter(d => d.door_name && d.width_inches > 0);
    if (validDoors.length === 0) {
      toast.error('Please add at least one door measurement');
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert photos to base64
      const equipmentPhotosBase64 = await Promise.all(
        equipmentPhotos.map(async (photo) => ({
          name: photo.file.name,
          base64: await fileToBase64(photo.file),
          type: photo.file.type,
        }))
      );

      const doorMeasurementsWithBase64 = await Promise.all(
        validDoors.map(async (door) => ({
          door_name: door.door_name,
          width_inches: door.width_inches,
          photo_base64: door.photo ? await fileToBase64(door.photo) : undefined,
        }))
      );

      const { data: response, error } = await supabase.functions.invoke('submit-pickup-request', {
        body: {
          ...data,
          door_measurements: doorMeasurementsWithBase64,
          equipment_photos: equipmentPhotosBase64,
        },
      });

      if (error) {
        throw error;
      }

      if (response?.success) {
        toast.success('Pickup request submitted successfully!');
        onSuccess();
      } else {
        throw new Error(response?.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sms_consent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      I agree to receive SMS updates about my pickup
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Equipment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="confirm_selling"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/50">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-medium">
                      I am selling my equipment and need to schedule a pickup! *
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormMessage>{form.formState.errors.confirm_selling?.message}</FormMessage>

            <FormField
              control={form.control}
              name="items_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Items List with Serial Numbers *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Example:&#10;1. Treadmill - NordicTrack T6.5 - Serial: NT123456&#10;2. Elliptical - Schwinn 470 - Serial: SW789012"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="item_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Where are the items located inside your home/facility? *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Example: Basement gym, through garage entrance"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <Label className="text-sm font-medium">Equipment Photos *</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Upload photos of the equipment you're selling
              </p>
              <EquipmentPhotoUpload
                photos={equipmentPhotos}
                onChange={setEquipmentPhotos}
              />
            </div>
          </CardContent>
        </Card>

        {/* Access & Logistics */}
        <Card>
          <CardHeader>
            <CardTitle>Access & Logistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FloorAccessInput form={form} />

            {hasStairs && (
              <FormField
                control={form.control}
                name="stairs_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Describe the stairs</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 12 steps, narrow stairwell, spiral stairs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div>
              <Label className="text-sm font-medium">Door Measurements *</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Measure all doorways the equipment will pass through. Include photos.
              </p>
              <DoorMeasurementsInput
                measurements={doorMeasurements}
                onChange={setDoorMeasurements}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Pickup Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apt, Suite, Unit (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Apt 4B" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input placeholder="New York" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State *</FormLabel>
                    <FormControl>
                      <Input placeholder="NY" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="10001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="preferred_payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Payment Method *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="venmo" id="venmo" />
                        <Label htmlFor="venmo">Venmo</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="paypal" id="paypal" />
                        <Label htmlFor="paypal">PayPal</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="check" id="check" />
                        <Label htmlFor="check">Business Check</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch('preferred_payment_method') === 'check'
                      ? 'Make Check To *'
                      : 'Username *'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        form.watch('preferred_payment_method') === 'check'
                          ? 'John Smith'
                          : '@username'
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Pickup Request'
          )}
        </Button>
      </form>
    </Form>
  );
}
