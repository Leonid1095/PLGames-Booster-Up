import { LandingClient } from '@/components/landing/LandingClient';
import { GamesSection } from '@/components/landing/GamesSection';

export default function HomePage() {
  return (
    <LandingClient gamesSlot={<GamesSection />} />
  );
}
