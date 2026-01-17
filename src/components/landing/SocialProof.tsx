import { Star, Quote } from 'lucide-react';

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

export function SocialProof() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            Testimonials
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            Loved by Retailers
            <span className="block text-primary">Like You</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl p-6 sm:p-8 border border-border relative"
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
        <div className="mt-16 bg-card rounded-2xl border border-border p-8 max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-heading text-foreground">500+</div>
              <div className="text-muted-foreground text-sm mt-1">Jobs Monthly</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-heading text-foreground">98%</div>
              <div className="text-muted-foreground text-sm mt-1">On-Time Delivery</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-heading text-foreground">4.9</div>
              <div className="text-muted-foreground text-sm mt-1">Customer Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-heading text-foreground">2hrs</div>
              <div className="text-muted-foreground text-sm mt-1">Avg Response Time</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
