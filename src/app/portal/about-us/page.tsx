import AboutHero from "@/components/about-us/about-hero";
import GoalMissionVisionSection from "@/components/about-us/goal-mission-vision-section";
import OfficialsCarousel from "@/components/about-us/officials-carousel";
import { barangayName } from "@/lib/data";

export default function AboutUsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <AboutHero />

      <GoalMissionVisionSection />

      <OfficialsCarousel
        title="Barangay"
        highlight="Officials"
        description={`Meet the current leaders who serve and support the ${barangayName} community.`}
        section="barangay"
      />

      <OfficialsCarousel
        title="Sangguniang"
        highlight="Kabataan"
        description={`Meet the youth leaders working for the young people of ${barangayName}.`}
        section="sk"
      />
    </div>
  );
}
