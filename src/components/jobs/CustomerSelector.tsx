import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
}

interface CustomerSelectorProps {
  value: string;
  onChange: (customerId: string) => void;
  onAddressSelect?: (address: { address?: string; city?: string; state?: string; zipCode?: string }) => void;
}

export function CustomerSelector({ value, onChange, onAddressSelect }: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    sms_consent: false,
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, name, address, city, state, zip_code')
      .order('name');
    if (data) setCustomers(data);
  };

  const handleCustomerChange = (customerId: string) => {
    onChange(customerId);
    
    // Auto-fill address from customer
    if (onAddressSelect) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        onAddressSelect({
          address: customer.address || undefined,
          city: customer.city || undefined,
          state: customer.state || undefined,
          zipCode: customer.zip_code || undefined,
        });
      }
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCustomer.name.trim()) {
      toast.error('Please enter a customer name');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('customers').insert({
        name: newCustomer.name,
        email: newCustomer.email || null,
        phone: newCustomer.phone || null,
        address: newCustomer.address || null,
        city: newCustomer.city || null,
        state: newCustomer.state || null,
        zip_code: newCustomer.zip_code || null,
        sms_consent: newCustomer.sms_consent,
        sms_consent_date: newCustomer.sms_consent ? new Date().toISOString() : null,
      }).select('id').single();

      if (error) throw error;

      await fetchCustomers();
      onChange(data.id);
      
      if (onAddressSelect && newCustomer.address) {
        onAddressSelect({
          address: newCustomer.address,
          city: newCustomer.city,
          state: newCustomer.state,
          zipCode: newCustomer.zip_code,
        });
      }

      toast.success('Customer created');
      setIsDialogOpen(false);
      setNewCustomer({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        sms_consent: false,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create customer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={handleCustomerChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select customer" />
        </SelectTrigger>
        <SelectContent>
          {customers.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button type="button" variant="outline" size="icon" onClick={() => setIsDialogOpen(true)}>
        <Plus className="w-4 h-4" />
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Name *</Label>
              <Input
                id="customerName"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer(c => ({ ...c, name: e.target.value }))}
                placeholder="Customer name"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer(c => ({ ...c, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone</Label>
                <Input
                  id="customerPhone"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer(c => ({ ...c, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerAddress">Address</Label>
              <Input
                id="customerAddress"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer(c => ({ ...c, address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerCity">City</Label>
                <Input
                  id="customerCity"
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer(c => ({ ...c, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerState">State</Label>
                <Input
                  id="customerState"
                  value={newCustomer.state}
                  onChange={(e) => setNewCustomer(c => ({ ...c, state: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerZip">ZIP</Label>
                <Input
                  id="customerZip"
                  value={newCustomer.zip_code}
                  onChange={(e) => setNewCustomer(c => ({ ...c, zip_code: e.target.value }))}
                />
              </div>
            </div>
            
            {/* SMS Consent Checkbox */}
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3">
              <Checkbox
                id="customerSmsConsent"
                checked={newCustomer.sms_consent}
                onCheckedChange={(checked) => 
                  setNewCustomer(c => ({ ...c, sms_consent: checked === true }))
                }
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="customerSmsConsent" className="text-sm font-medium cursor-pointer">
                  SMS Consent
                </Label>
                <p className="text-xs text-muted-foreground">
                  Customer agrees to receive SMS notifications. 
                  See <a href="/sms-terms" target="_blank" className="underline hover:text-foreground">SMS Terms</a>.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Add Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
