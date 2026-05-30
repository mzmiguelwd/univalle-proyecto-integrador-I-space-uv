import { HeroFeatureShowcaseSection } from "../components/landing/HeroFeatureShowcaseSection";
import { LandingFooterSection } from "../components/landing/LandingFooterSection";
import { LandingHeaderSection } from "../components/landing/LandingHeaderSection";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-start bg-[#131313]">
      <LandingHeaderSection />
      <HeroFeatureShowcaseSection />
      <LandingFooterSection />
    </main>
  );
}