import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { PickupRequestForm } from '@/components/pickup/PickupRequestForm';

export default function RequestPickup() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Request Submitted!</h1>
          <p className="text-muted-foreground">
            Thank you for your pickup request. Our team will review it and contact you within 1-2 business hours to schedule your pickup.
          </p>
          <p className="text-sm text-muted-foreground">
            Check your email for a confirmation with the details of your request.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Equipment Pickup Request</h1>
          <p className="text-muted-foreground">
            Selling your gym equipment? Fill out this form and we'll schedule a pickup.
          </p>
        </div>
        
        <PickupRequestForm onSuccess={() => setIsSubmitted(true)} />
      </div>
    </div>
  );
}
