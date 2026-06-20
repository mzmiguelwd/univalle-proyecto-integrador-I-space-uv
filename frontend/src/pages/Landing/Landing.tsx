import { HeroFeatureShowcase } from "./HeroFeatureShowcase.tsx";
import { Footer } from "./Footer.tsx";
import { Header } from "./Header.tsx";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-start bg-[#131313]">
      <Header />
      <HeroFeatureShowcase />
      <Footer />
    </main>
  );
}
