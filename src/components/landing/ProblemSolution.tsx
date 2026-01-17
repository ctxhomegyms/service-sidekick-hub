import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const problems = [
  'Missed delivery windows frustrating customers',
  'No visibility into technician locations',
  'Paper checklists getting lost or forgotten',
  'Customers calling for status updates',
  'Juggling spreadsheets and text messages',
];

const solutions = [
  'Smart scheduling with conflict detection',
  'Real-time GPS tracking for every technician',
  'Digital checklists with photo documentation',
  'Automated SMS updates at every milestone',
  'One dashboard for complete visibility',
];

export function ProblemSolution() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: problemsRef, isVisible: problemsVisible } = useScrollAnimation();
  const { ref: solutionsRef, isVisible: solutionsVisible } = useScrollAnimation();

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
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            Stop Juggling Spreadsheets
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your e-commerce handles sales. Let us handle everything after the checkout.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-16 max-w-5xl mx-auto">
          {/* Problems Column */}
          <div 
            ref={problemsRef}
            className={cn(
              "bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-card transition-all duration-700 ease-out",
              problemsVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            )}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-xl font-heading text-foreground">Without FixAGym</h3>
            </div>
            <ul className="space-y-4">
              {problems.map((problem, index) => (
                <li 
                  key={index} 
                  className={cn(
                    "flex items-start gap-3 transition-all duration-500 ease-out",
                    problemsVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                  )}
                  style={{ transitionDelay: `${(index + 1) * 100}ms` }}
                >
                  <XCircle className="w-5 h-5 text-destructive/70 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{problem}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions Column */}
          <div 
            ref={solutionsRef}
            className={cn(
              "bg-card rounded-2xl p-6 sm:p-8 border-2 border-primary/20 shadow-lg relative overflow-hidden transition-all duration-700 ease-out",
              solutionsVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            )}
            style={{ transitionDelay: '150ms' }}
          >
            {/* Accent gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
            
            <div className="flex items-center gap-3 mb-6 relative">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-xl font-heading text-foreground">With FixAGym Field</h3>
            </div>
            <ul className="space-y-4 relative">
              {solutions.map((solution, index) => (
                <li 
                  key={index} 
                  className={cn(
                    "flex items-start gap-3 transition-all duration-500 ease-out",
                    solutionsVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                  )}
                  style={{ transitionDelay: `${(index + 1) * 100 + 150}ms` }}
                >
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
                  <span className="text-foreground">{solution}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
