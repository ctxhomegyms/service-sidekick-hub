import { useState } from 'react';
import { Mail, Phone, MapPin, Pencil, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ServiceDetailsCardProps {
  job: {
    id: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    customer: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      zip_code: string | null;
    } | null;
  };
  onUpdate: () => void;
}

export function ServiceDetailsCard({ job, onUpdate }: ServiceDetailsCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    address: job.address || '',
    city: job.city || '',
    state: job.state || '',
    zip_code: job.zip_code || '',
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          zip_code: formData.zip_code || null,
        })
        .eq('id', job.id);

      if (error) throw error;

      toast.success('Service details updated');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating service details:', error);
      toast.error('Failed to update service details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      address: job.address || '',
      city: job.city || '',
      state: job.state || '',
      zip_code: job.zip_code || '',
    });
    setIsEditing(false);
  };

  const displayAddress = job.address 
    ? `${job.address}${job.city ? `, ${job.city}` : ''}${job.state ? `, ${job.state}` : ''}${job.zip_code ? ` ${job.zip_code}` : ''}`
    : 'No address set';

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Service Details</h3>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
              <X className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Check className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Street address"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="City"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                placeholder="State"
              />
            </div>
            <div>
              <Label htmlFor="zip_code">ZIP</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                placeholder="ZIP"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {job.customer && (
            <>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium text-primary">
                    {job.customer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{job.customer.name}</p>
                  <p className="text-sm text-muted-foreground">Customer</p>
                </div>
              </div>

              {job.customer.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${job.customer.email}`} className="text-primary hover:underline">
                    {job.customer.email}
                  </a>
                </div>
              )}

              {job.customer.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${job.customer.phone}`} className="text-primary hover:underline">
                    {job.customer.phone}
                  </a>
                </div>
              )}
            </>
          )}

          <div className="flex items-start gap-3 text-sm pt-2 border-t">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
            <span className="text-muted-foreground">{displayAddress}</span>
          </div>
        </div>
      )}
    </div>
  );
}
