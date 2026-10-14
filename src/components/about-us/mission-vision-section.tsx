import { Eye, Target, type LucideIcon } from "lucide-react";
import { getBarangaySettings } from "@/actions/settings";
import { barangayName } from "@/lib/data";
import GoldTrim from "./gold-trim";
import SectionHeading from "./section-heading";

// Same nameplate and gold trim as the officials' cards, with the plate as a header.
function StatementCard({ icon: Icon, label, statement }: { icon: LucideIcon; label: string; statement: string }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-card shadow-sm outline -outline-offset-1 outline-black/10 dark:outline-white/10">
      <div className="flex items-center justify-center gap-2 bg-nameplate px-4 py-3 text-primary-foreground">
        <Icon className="size-5" />
        <h3 className="text-lg font-bold">{label}</h3>
      </div>
      <GoldTrim />
      <p className="flex flex-1 items-center justify-center px-6 py-8 text-center leading-relaxed text-pretty sm:text-lg">
        {statement}
      </p>
    </div>
  );
}

export default async function MissionVisionSection() {
  const { mission, vision } = await getBarangaySettings();

  return (
    <section className="space-y-8 py-6">
      <SectionHeading
        title="Our"
        highlight="Mission & Vision"
        description={`The goals that guide how ${barangayName} serves its residents.`}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <StatementCard icon={Target} label="Mission" statement={mission} />
        <StatementCard icon={Eye} label="Vision" statement={vision} />
      </div>
    </section>
  );
}
