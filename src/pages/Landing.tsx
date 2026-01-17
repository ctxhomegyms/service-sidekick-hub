import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { ProblemSolution } from '@/components/landing/ProblemSolution';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { SocialProof } from '@/components/landing/SocialProof';
import { PricingCTA } from '@/components/landing/PricingCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function Landing() {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <main>
        <HeroSection />
        <ProblemSolution />
        <FeaturesGrid />
        <HowItWorks />
        <SocialProof />
        <PricingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
