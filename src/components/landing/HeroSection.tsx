import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';

export function HeroSection() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-sidebar">
      {/* Background gradient */}
      <div 
        className="absolute inset-0 opacity-60"
        style={{
          background: 'linear-gradient(135deg, hsl(0, 0%, 6%) 0%, hsl(0, 0%, 12%) 50%, hsl(0, 60%, 20%) 100%)'
        }}
      />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Floating accent shapes */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-sidebar-accent/50 border border-sidebar-border rounded-full px-4 py-2 mb-8 animate-fade-in">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sidebar-foreground/80 text-sm">Built for Fitness Equipment Retailers</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl text-white mb-6 leading-tight animate-slide-up">
            Deliver More Than
            <span className="block text-primary">Equipment</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-sidebar-foreground/70 mb-8 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            The field service platform built for online fitness retailers. Manage deliveries, assemblies, and pickups—all from one dashboard. 
            <span className="text-white font-medium"> No invoicing needed.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Button
              size="lg"
              onClick={() => scrollToSection('pricing')}
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 gap-2 w-full sm:w-auto"
            >
              Request a Demo
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollToSection('features')}
              className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent text-lg px-8 py-6 gap-2 w-full sm:w-auto"
            >
              <Play className="w-5 h-5" />
              See It In Action
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 pt-8 border-t border-sidebar-border/30 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <p className="text-sidebar-foreground/50 text-sm mb-6">Trusted by fitness equipment retailers nationwide</p>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
              <div className="text-center">
                <div className="text-3xl font-heading text-white">500+</div>
                <div className="text-sidebar-foreground/60 text-sm">Jobs Completed</div>
              </div>
              <div className="hidden sm:block w-px h-12 bg-sidebar-border/50" />
              <div className="text-center">
                <div className="text-3xl font-heading text-white">98%</div>
                <div className="text-sidebar-foreground/60 text-sm">Customer Satisfaction</div>
              </div>
              <div className="hidden sm:block w-px h-12 bg-sidebar-border/50" />
              <div className="text-center">
                <div className="text-3xl font-heading text-white">24/7</div>
                <div className="text-sidebar-foreground/60 text-sm">Real-time Tracking</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-sidebar-foreground/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-sidebar-foreground/50 rounded-full" />
        </div>
      </div>
    </section>
  );
}
