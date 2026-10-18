import { Eye, Flag, Target, type LucideIcon } from "lucide-react";
import { getBarangaySettings } from "@/actions/settings";
import { barangayName } from "@/lib/data";
import { cn } from "@/lib/utils";
import GoldTrim from "./gold-trim";
import SectionHeading from "./section-heading";

// Same nameplate and gold trim as the officials' cards, with the plate as a header.
function StatementCard({
  icon: Icon,
  label,
  statement,
  className,
}: {
  icon: LucideIcon;
  label: string;
  statement: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl bg-card shadow-sm outline -outline-offset-1 outline-black/10 dark:outline-white/10",
        className,
      )}
    >
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

export default async function GoalMissionVisionSection() {
  const { goal, mission, vision } = await getBarangaySettings();

  return (
    <section className="space-y-8 py-6">
      <SectionHeading
        title="Our"
        highlight="Goal, Mission & Vision"
        description={`The direction that guides how ${barangayName} serves its residents.`}
      />
      {/* Three across on large screens; below that the goal spans the row above mission and vision. */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatementCard icon={Flag} label="Goal" statement={goal} className="sm:col-span-2 lg:col-span-1" />
        <StatementCard icon={Target} label="Mission" statement={mission} />
        <StatementCard icon={Eye} label="Vision" statement={vision} />
      </div>
    </section>
  );
}
