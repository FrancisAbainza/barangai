import { RevealGroup, RevealItem } from "@/components/landing/animations";
import { cn } from "@/lib/utils";

interface SectionIntroProps {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}

// The eyebrow, heading and lead line that open each landing page section. They rise in one after another.
export default function SectionIntro({ eyebrow, title, description, className }: SectionIntroProps) {
  return (
    <RevealGroup className={cn("flex flex-col gap-2.5", className)}>
      <RevealItem>
        <p className="text-[0.8125rem] font-bold tracking-widest text-primary uppercase">{eyebrow}</p>
      </RevealItem>
      <RevealItem>
        <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h2>
      </RevealItem>
      {description && (
        <RevealItem>
          <p className="text-lg text-pretty text-foreground/70">{description}</p>
        </RevealItem>
      )}
    </RevealGroup>
  );
}
