import Image from "next/image";
import { barangayLogoSrc, barangayName } from "@/lib/data";
import GoldTrim from "./gold-trim";

// A large version of the officials' nameplates: brand-blue plate, white type, gold trim.
export default function AboutHero() {
  return (
    <section className="relative overflow-hidden rounded-xl bg-nameplate text-primary-foreground shadow-sm">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(255_255_255/0.16),transparent_65%)]"
      />

      <div className="relative flex flex-col items-center px-6 py-10 text-center sm:py-14">
        <div className="rounded-full bg-white p-1.5 shadow-lg ring-4 ring-white/15">
          <Image src={barangayLogoSrc} alt={`${barangayName} logo`} width={104} height={104} className="size-20 sm:size-26" />
        </div>
        <p className="mt-6 text-xs font-semibold tracking-[0.25em] text-primary-foreground/70 uppercase">About Us</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{barangayName}</h1>
        <p className="mt-2 text-primary-foreground/80">Carmona, Cavite</p>
      </div>

      <GoldTrim className="h-1.5" />
    </section>
  );
}
