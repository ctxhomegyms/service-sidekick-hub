import { ShoppingCart, ClipboardList, CheckCircle2, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: ShoppingCart,
    number: '01',
    title: 'Customer Buys Equipment',
    description: 'Your e-commerce platform handles the sale and payment. Nothing changes in your checkout flow.',
  },
  {
    icon: ClipboardList,
    number: '02',
    title: 'You Create the Job',
    description: 'Add the delivery or assembly job in FixAGym Field. Assign it to a technician and set the schedule.',
  },
  {
    icon: CheckCircle2,
    number: '03',
    title: 'Customer Is Delighted',
    description: 'Technician completes the job with photo documentation. Customer receives updates every step of the way.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-sidebar text-sidebar-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-block bg-sidebar-accent text-sidebar-foreground px-4 py-2 rounded-full text-sm font-medium mb-4 border border-sidebar-border">
            How It Works
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-white mb-4">
            Simple as 1-2-3
          </h2>
          <p className="text-lg text-sidebar-foreground/70 max-w-2xl mx-auto">
            Keep using your existing checkout. We handle everything after the sale.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection lines for desktop */}
            <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
            
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Mobile arrow */}
                {index < steps.length - 1 && (
                  <div className="md:hidden absolute -bottom-4 left-1/2 -translate-x-1/2 text-primary">
                    <ArrowRight className="w-6 h-6 rotate-90" />
                  </div>
                )}
                
                <div className="bg-sidebar-accent/50 border border-sidebar-border rounded-2xl p-6 sm:p-8 text-center relative">
                  {/* Step number */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground font-heading text-sm px-4 py-1 rounded-full">
                    Step {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-sidebar-accent border border-sidebar-border flex items-center justify-center mb-6 mt-4">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                  
                  <h3 className="text-xl font-heading text-white mb-3">
                    {step.title}
                  </h3>
                  
                  <p className="text-sidebar-foreground/70 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration note */}
        <div className="mt-16 text-center">
          <p className="text-sidebar-foreground/50 text-sm">
            Works with any e-commerce platform • No payment integration required • Your existing checkout stays the same
          </p>
        </div>
      </div>
    </section>
  );
}
