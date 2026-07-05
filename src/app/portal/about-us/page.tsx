import Image from "next/image";
import { Info, Landmark, Users } from "lucide-react";
import PageHeader from "@/components/page-header";
import MissionVisionSection from "@/components/about-us/mission-vision-section";
import OfficialsGrid from "@/components/about-us/officials-grid";
import { Card } from "@/components/ui/card";
import { barangayLogoSrc, barangayName } from "@/lib/data";
import { getAuthRole } from "@/lib/auth";

export default async function AboutUsPage() {
  const { isAdmin } = await getAuthRole();

  return (
    <div className="container space-y-6 m-auto">
      <PageHeader
        icon={Info}
        title="About Us"
        description="Barangay Maduya officials and Sangguniang Kabataan"
      />

      <Card
        className="flex flex-col items-center gap-3 py-10 text-center overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(0, 56, 168, 0.7) 0%, transparent 30%, transparent 70%, rgba(206, 17, 38, 0.7) 100%)",
        }}
      >
        <Image src={barangayLogoSrc} alt={`${barangayName} logo`} width={120} height={120} />
        <h2 className="text-2xl font-bold tracking-tight">{barangayName}</h2>
        <p className="text-sm text-muted-foreground">Carmona, Cavite</p>
      </Card>

      <MissionVisionSection />

      <OfficialsGrid
        title="Barangay Officials"
        icon={<Landmark />}
        addLabel="Add Official"
        section="barangay"
        isAdmin={isAdmin}
      />

      <OfficialsGrid
        title="Sangguniang Kabataan"
        icon={<Users />}
        addLabel="Add SK"
        section="sk"
        isAdmin={isAdmin}
      />
    </div>
  );
}
