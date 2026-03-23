import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Phone, Mail, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { findDuplicateCustomers, DuplicateCustomer } from '@/lib/customerValidation';
import { DuplicateCustomerWarning } from '@/components/customers/DuplicateCustomerWarning';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  notes: string | null;
  created_at: string;
}

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateCustomer[]>([]);
  const [skipDuplicateCheck, setSkipDuplicateCheck] = useState(false);
  
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    notes: '',
    sms_consent: false,
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check for duplicates when phone or email changes
  const checkForDuplicates = useCallback(async (phone: string, email: string) => {
    if (!phone && !email) {
      setDuplicates([]);
      return;
    }
    
    const found = await findDuplicateCustomers(phone || null, email || null);
    setDuplicates(found);
  }, []);

  // Debounced duplicate check
  useEffect(() => {
    if (!isDialogOpen) return;
    
    const timer = setTimeout(() => {
      if (!skipDuplicateCheck) {
        checkForDuplicates(newCustomer.phone, newCustomer.email);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [newCustomer.phone, newCustomer.email, isDialogOpen, skipDuplicateCheck, checkForDuplicates]);

  const handleUseExistingCustomer = (customerId: string) => {
    setIsDialogOpen(false);
    navigate(`/customers/${customerId}`);
  };

  const handleCreateAnyway = () => {
    setSkipDuplicateCheck(true);
    setDuplicates([]);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCustomer.name.trim()) {
      toast.error('Please enter a customer name');
      return;
    }

    // If duplicates exist and user hasn't confirmed, show warning
    if (duplicates.length > 0 && !skipDuplicateCheck) {
      toast.error('Please resolve the duplicate customer warning first');
      return;
    }

    try {
      const { error } = await supabase.from('customers').insert({
        name: newCustomer.name,
        email: newCustomer.email || null,
        phone: newCustomer.phone || null,
        address: newCustomer.address || null,
        city: newCustomer.city || null,
        state: newCustomer.state || null,
        zip_code: newCustomer.zip_code || null,
        notes: newCustomer.notes || null,
        sms_consent: newCustomer.sms_consent,
        sms_consent_date: newCustomer.sms_consent ? new Date().toISOString() : null,
      });

      if (error) throw error;

      toast.success('Customer created successfully');
      setIsDialogOpen(false);
      setNewCustomer({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        notes: '',
        sms_consent: false,
      });
      setDuplicates([]);
      setSkipDuplicateCheck(false);
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create customer');
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setDuplicates([]);
      setSkipDuplicateCheck(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
            <p className="text-muted-foreground">Manage your customer database</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>
                  Add a new customer to your database
                </DialogDescription>
              </DialogHeader>
              
              {/* Duplicate Customer Warning */}
              {duplicates.length > 0 && !skipDuplicateCheck && (
                <DuplicateCustomerWarning
                  duplicates={duplicates}
                  onUseExisting={handleUseExistingCustomer}
                  onCreateNew={handleCreateAnyway}
                />
              )}
              
              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer(c => ({ ...c, name: e.target.value }))}
                      placeholder="Customer name"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer(c => ({ ...c, email: e.target.value }))}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer(c => ({ ...c, phone: e.target.value }))}
                        placeholder="(555) 555-5555"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer(c => ({ ...c, address: e.target.value }))}
                      placeholder="Street address"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={newCustomer.city}
                        onChange={(e) => setNewCustomer(c => ({ ...c, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={newCustomer.state}
                        onChange={(e) => setNewCustomer(c => ({ ...c, state: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP</Label>
                      <Input
                        id="zip"
                        value={newCustomer.zip_code}
                        onChange={(e) => setNewCustomer(c => ({ ...c, zip_code: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newCustomer.notes}
                      onChange={(e) => setNewCustomer(c => ({ ...c, notes: e.target.value }))}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>

                  {/* SMS Consent Checkbox */}
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
                    <Checkbox
                      id="sms_consent"
                      checked={newCustomer.sms_consent}
                      onCheckedChange={(checked) => 
                        setNewCustomer(c => ({ ...c, sms_consent: checked === true }))
                      }
                      className="mt-0.5"
                    />
                     <div className="space-y-1">
                      <Label htmlFor="sms_consent" className="text-sm font-medium cursor-pointer">
                        SMS Consent
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Customer agrees to receive automated service-related SMS messages from CTX Home Gyms via Fix A Gym Field, 
                        including appointment reminders, technician en-route alerts, job completion updates, and scheduling notifications. 
                        Msg frequency varies. Msg &amp; data rates may apply. Reply <strong>STOP</strong> to opt out, <strong>HELP</strong> for help. 
                        See our <a href="/sms-terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">SMS Terms</a> &amp;{' '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Privacy Policy</a>.
                      </p>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Customer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Customers Grid */}
        {filteredCustomers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.map((customer) => (
              <Card 
                key={customer.id} 
                className="animate-fade-in hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/customers/${customer.id}`)}
              >
                <CardHeader className="pb-2">
                  <h3 className="font-semibold text-lg">{customer.name}</h3>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 shrink-0" />
                      <a href={`mailto:${customer.email}`} className="hover:text-foreground truncate">
                        {customer.email}
                      </a>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 shrink-0" />
                      <a href={`tel:${customer.phone}`} className="hover:text-foreground">
                        {customer.phone}
                      </a>
                    </div>
                  )}
                  {(customer.address || customer.city) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {[customer.address, customer.city, customer.state]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? 'No customers match your search' : 'No customers yet. Add your first customer!'}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
