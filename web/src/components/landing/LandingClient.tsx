'use client';

import { AuthProvider } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from './HeroSection';
import { PlatformsSection } from './PlatformsSection';
import { HowItWorksSection } from './HowItWorksSection';
import { TechnologySection } from './TechnologySection';
import { AdvantagesSection } from './AdvantagesSection';
import { GlobalCoverageSection } from './GlobalCoverageSection';
import { PricingSection } from './PricingSection';
import { FaqSection } from './FaqSection';
import { CtaSection } from './CtaSection';
import { Footer } from '@/components/layout/Footer';

export function LandingClient({ gamesSlot }: { gamesSlot: React.ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      <main>
        <HeroSection />
        <PlatformsSection />
        <TechnologySection />
        <HowItWorksSection />
        {gamesSlot}
        <AdvantagesSection />
        <GlobalCoverageSection />
        <PricingSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </AuthProvider>
  );
}
