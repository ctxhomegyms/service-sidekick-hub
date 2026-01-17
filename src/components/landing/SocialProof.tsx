import { Star, Quote } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const testimonials = [
  {
    quote: "FixAGym Field transformed our delivery operations. Our customers love the real-time updates, and we've cut scheduling conflicts by 90%.",
    author: "Sarah Mitchell",
    role: "Operations Manager",
    company: "FitEquip Direct",
    rating: 5,
  },
  {
    quote: "The equipment checklists are a game-changer. Every assembly is documented, every customer is satisfied, and we have photo proof of quality work.",
    author: "Marcus Chen",
    role: "Owner",
    company: "Home Gym Pros",
    rating: 5,
  },
  {
    quote: "Finally, a field service platform that understands online retail. No invoicing headaches, just smooth operations from sale to setup.",
    author: "Jennifer Brooks",
    role: "VP of Customer Experience",
    company: "Elite Fitness Supply",
    rating: 5,
  },
];

const stats = [
  { value: '500+', label: 'Jobs Monthly' },
  { value: '98%', label: 'On-Time Delivery' },
  { value: '4.9', label: 'Customer Rating' },
  { value: '2hrs', label: 'Avg Response Time' },
];

export function SocialProof() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollAnimation();
  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation();

  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          ref={headerRef}
          className={cn(
            "text-center mb-16 transition-all duration-700 ease-out",
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            Testimonials
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            Loved by Retailers
            <span className="block text-primary">Like You</span>
          </h2>
        </div>

        <div ref={cardsRef} className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={cn(
                "bg-card rounded-2xl p-6 sm:p-8 border border-border relative transition-all duration-700 ease-out",
                cardsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Quote icon */}
              <div className="absolute top-6 right-6 text-primary/10">
                <Quote className="w-12 h-12" />
              </div>
              
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                ))}
              </div>
              
              {/* Quote */}
              <blockquote className="text-foreground mb-6 leading-relaxed relative z-10">
                "{testimonial.quote}"
              </blockquote>
              
              {/* Author */}
              <div className="border-t border-border pt-4">
                <div className="font-medium text-foreground">
                  {testimonial.author}
                </div>
                <div className="text-sm text-muted-foreground">
                  {testimonial.role}, {testimonial.company}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div 
          ref={statsRef}
          className={cn(
            "mt-16 bg-card rounded-2xl border border-border p-8 max-w-4xl mx-auto transition-all duration-700 ease-out",
            statsVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
          )}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className={cn(
                  "text-center transition-all duration-500 ease-out",
                  statsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
                style={{ transitionDelay: `${index * 100 + 200}ms` }}
              >
                <div className="text-3xl sm:text-4xl font-heading text-foreground">{stat.value}</div>
                <div className="text-muted-foreground text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
