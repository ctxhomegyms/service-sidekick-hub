import { AlertTriangle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DuplicateCustomer } from '@/lib/customerValidation';

interface DuplicateCustomerWarningProps {
  duplicates: DuplicateCustomer[];
  onUseExisting: (customerId: string) => void;
  onCreateNew: () => void;
}

export function DuplicateCustomerWarning({
  duplicates,
  onUseExisting,
  onCreateNew,
}: DuplicateCustomerWarningProps) {
  if (duplicates.length === 0) return null;

  return (
    <Alert variant="destructive" className="bg-yellow-50 border-yellow-200 text-yellow-800">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">Potential Duplicate Customer</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3 text-yellow-700">
          We found {duplicates.length} existing customer(s) with matching contact information:
        </p>
        <div className="space-y-2 mb-4">
          {duplicates.map((dup) => (
            <div
              key={dup.id}
              className="flex items-center justify-between rounded-lg border border-yellow-200 bg-white p-3"
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="font-medium text-foreground">{dup.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Match: {dup.match_type === 'phone' ? `Phone: ${dup.phone}` : `Email: ${dup.email}`}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUseExisting(dup.id)}
              >
                Use This
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateNew}
          className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
        >
          Create New Customer Anyway
        </Button>
      </AlertDescription>
    </Alert>
  );
}
