import { 
  CalendarDays, 
  Smartphone, 
  MessageSquare, 
  ClipboardCheck, 
  Truck, 
  LayoutDashboard,
  MapPin,
  Bell,
  Camera,
  Users,
  BarChart3,
  Clock
} from 'lucide-react';

const features = [
  {
    icon: CalendarDays,
    title: 'Smart Scheduling',
    description: 'Drag-and-drop calendar with automatic conflict detection. Never double-book a technician again.',
    highlights: ['Conflict detection', 'Route optimization', 'Time windows'],
  },
  {
    icon: Smartphone,
    title: 'Technician Mobile App',
    description: 'Everything your crew needs in their pocket. Job details, navigation, checklists, and customer info.',
    highlights: ['Offline capable', 'GPS navigation', 'Photo uploads'],
  },
  {
    icon: MessageSquare,
    title: 'Customer Communication',
    description: 'Keep customers in the loop automatically. SMS updates for scheduling, en-route alerts, and completion.',
    highlights: ['Automated SMS', 'Appointment reminders', 'Review requests'],
  },
  {
    icon: ClipboardCheck,
    title: 'Equipment Checklists',
    description: 'Pre-built templates for treadmills, ellipticals, and strength equipment. Ensure consistent quality every time.',
    highlights: ['Custom templates', 'Photo verification', 'Digital signatures'],
  },
  {
    icon: Truck,
    title: 'Pickup & Buyback',
    description: 'Public pickup request forms let customers schedule returns. Complete with photos and access details.',
    highlights: ['Customer self-service', 'Door measurements', 'Floor access info'],
  },
  {
    icon: LayoutDashboard,
    title: 'Real-time Dashboard',
    description: 'See everything at a glance. Job status, technician locations, and completion rates in one view.',
    highlights: ['Live updates', 'Performance metrics', 'Team overview'],
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            Features
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            Everything You Need to
            <span className="block text-primary">Deliver Excellence</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Purpose-built for fitness equipment retailers. From warehouse to customer's home, we've got you covered.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-card rounded-2xl p-6 sm:p-8 border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              
              <h3 className="text-xl font-heading text-foreground mb-3">
                {feature.title}
              </h3>
              
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {feature.description}
              </p>
              
              <div className="flex flex-wrap gap-2">
                {feature.highlights.map((highlight, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-secondary text-secondary-foreground px-3 py-1 rounded-full"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
