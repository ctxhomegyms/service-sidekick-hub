import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const benefits = [
  'No payment processing fees',
  'Unlimited technicians',
  'SMS notifications included',
  'Equipment checklist templates',
  'Real-time GPS tracking',
  'Customer self-service portal',
];

export function PricingCTA() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.company) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('submit-demo-request', {
        body: {
          name: formData.name,
          email: formData.email,
          company: formData.company,
          message: formData.message || undefined,
        },
      });

      if (error) throw error;

      toast.success('Thanks! We\'ll be in touch within 24 hours.');
      setFormData({ name: '', email: '', company: '', message: '' });
      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Demo request error:', error);
      toast.error(error.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { ref: leftRef, isVisible: leftVisible } = useScrollAnimation();
  const { ref: rightRef, isVisible: rightVisible } = useScrollAnimation();

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left side - Value prop */}
            <div
              ref={leftRef}
              className={cn(
                "transition-all duration-700 ease-out",
                leftVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
              )}
            >
              <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                Get Started
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-6">
                Simple Pricing That
                <span className="block text-primary">Scales With You</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                You already handle payments at checkout. We don't charge transaction fees or take a cut of your sales. 
                Just a simple monthly subscription that grows with your business.
              </p>

              <ul className="grid sm:grid-cols-2 gap-3 mb-8">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="bg-muted/50 rounded-xl p-6 border border-border">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-heading text-foreground">$99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  Starting price for up to 100 jobs/month. Custom plans available for high-volume operations.
                </p>
              </div>
            </div>

            {/* Right side - Contact form */}
            <div 
              ref={rightRef}
              className={cn(
                "bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-lg transition-all duration-700 ease-out",
                rightVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
              )}
              style={{ transitionDelay: '150ms' }}
            >
              {isSubmitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                  <h3 className="text-2xl font-heading text-foreground mb-2">
                    Request Received!
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Thanks for your interest in FixAGym Field. We'll be in touch within 24 hours to schedule your personalized demo.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setIsSubmitted(false)}
                    className="gap-2"
                  >
                    Submit Another Request
                  </Button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-heading text-foreground mb-2">
                    Request a Demo
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    See FixAGym Field in action. We'll walk you through the platform.
                  </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
                      Name *
                    </label>
                    <Input
                      id="name"
                      placeholder="John Smith"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                      Email *
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-foreground mb-1.5">
                    Company *
                  </label>
                  <Input
                    id="company"
                    placeholder="Your Fitness Equipment Company"
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1.5">
                    Tell us about your operation
                  </label>
                  <Textarea
                    id="message"
                    placeholder="How many technicians? Monthly job volume? Current pain points?"
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 py-6 text-lg gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Schedule Your Demo
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>

                <p className="text-center text-muted-foreground text-sm">
                  Free demo • No credit card required • Response within 24 hours
                </p>
              </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
