import Image from "next/image";
import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CalendarCheck,
  ChartColumn,
  Cloud,
  Eye,
  FileText,
  Flag,
  LockKeyhole,
  MapPin,
  Store,
  Target,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { getBarangaySettings } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Float, ReducedMotionConfig, Reveal, RevealGroup, RevealItem } from "@/components/landing/animations";
import NewsCarousel from "@/components/landing/news-carousel";
import OfficialsShowcase from "@/components/landing/officials-showcase";
import SectionIntro from "@/components/landing/section-intro";
import { barangayCity, barangayLogoSrc, barangayName } from "@/lib/data";
import { cn, toTelHref } from "@/lib/utils";

type Service = {
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
  href: string;
  featured?: boolean;
};

// The portal routes send signed-out visitors to log in, then on to the service.
const services: Service[] = [
  {
    icon: FileText,
    title: "Document request",
    description:
      "Apply online for a barangay clearance, a certificate of residency or indigency, and other documents, then follow your request until it's ready.",
    cta: "Log in to request",
    href: "/portal/document-request",
    featured: true,
  },
  {
    icon: TriangleAlert,
    title: "Complaint reporting",
    description: "Report noise, sanitation, safety and other concerns to the barangay, and follow each report's progress.",
    cta: "Log in to file a report",
    href: "/portal/complaint",
    featured: true,
  },
  {
    icon: CalendarCheck,
    title: "Court reservation",
    description: "Book the barangay court and see which times are already taken.",
    cta: "Log in to book",
    href: "/portal/court-reservation",
  },
  {
    icon: Store,
    title: "Community hub",
    description: "Discover and support local businesses in our business directory.",
    cta: "Log in to browse",
    href: "/portal/community-hub",
  },
  {
    icon: ChartColumn,
    title: "Transparency",
    description: "Browse the barangay's projects and programs, with their budgets and locations.",
    cta: "View projects",
    href: "/transparency",
  },
];

type TechFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const techFeatures: Record<"ai" | "assistant" | "cloud", TechFeature> = {
  ai: {
    icon: BrainCircuit,
    title: "Artificial Intelligence",
    description:
      "Sorts each complaint report by category and urgency as soon as it's filed, and gives barangay staff budget, manpower and timeframe estimates for the response.",
  },
  assistant: {
    icon: Bot,
    title: "AI Assistant",
    description:
      "Ask about barangay services by typing or speaking. The portal's assistant answers your questions and points you to the right page or form.",
  },
  cloud: {
    icon: Cloud,
    title: "Cloud-Based Infrastructure",
    description:
      "Your requests, reports, bookings and uploaded files are saved online, so you can sign in from any device to check their status and get notified when it changes.",
  },
};

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/news", label: "News" },
  { href: "/transparency", label: "Transparency" },
  { href: "/about-us", label: "About Us" },
];

// Same width and side padding as the News and About Us pages.
const containerClassName = "mx-auto w-full px-6 md:container";
const sectionClassName = cn(containerClassName, "py-20 lg:py-22");

function ServiceCard({ service }: { service: Service }) {
  const { icon: Icon, title, description, cta, href, featured } = service;

  return (
    <RevealItem
      className={cn(
        featured ? "lg:col-span-3" : "lg:col-span-2",
        // In the two-column layout the last card spans both columns instead of sitting alone.
        "sm:last:col-span-2",
      )}
    >
      <Link
        href={href}
        className="group block h-full rounded-xl outline-offset-2 focus-visible:outline-3 focus-visible:outline-yellow-500"
      >
        <Card
          className={cn(
            "flex h-full min-h-65 flex-col gap-3.5 shadow-none transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-primary-deep/10",
            featured
              ? "border-0 bg-primary p-8 text-primary-foreground group-hover:bg-primary/90"
              : "p-7 group-hover:border-primary/40",
          )}
        >
          <span
            className={cn(
              "flex size-13 items-center justify-center rounded-xl",
              featured ? "bg-background text-primary" : "bg-primary/8 text-primary",
            )}
          >
            <Icon className="size-6.5" />
          </span>
          <h3 className="text-2xl font-bold">{title}</h3>
          <p className={cn("text-[1.0625rem] leading-relaxed", featured ? "text-primary-foreground/85" : "text-foreground/70")}>
            {description}
          </p>
          <span
            className={cn(
              "mt-auto inline-flex items-center gap-2 text-[1.0625rem] font-bold",
              !featured && "text-primary",
            )}
          >
            {cta}
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Card>
      </Link>
    </RevealItem>
  );
}

function TechCard({
  feature,
  className,
  descriptionClassName,
}: {
  feature: TechFeature;
  className?: string;
  descriptionClassName?: string;
}) {
  const { icon: Icon, title, description } = feature;

  return (
    <Card className={cn("flex min-h-57.5 flex-col justify-end gap-2 border-0 p-7 shadow-none", className)}>
      <Icon className="size-7.5" />
      <h3 className="text-[1.375rem] font-bold">{title}</h3>
      <p className={cn("leading-relaxed", descriptionClassName)}>{description}</p>
    </Card>
  );
}

export default async function Home() {
  const { goal, mission, vision, hotline1, hotline2, email, address } = await getBarangaySettings();
  const hotlines = [hotline1, hotline2].filter(Boolean);
  const statements = [
    { icon: Flag, label: "Goal", statement: goal },
    { icon: Target, label: "Mission", statement: mission },
    { icon: Eye, label: "Vision", statement: vision },
  ];

  return (
    <main>
      <ReducedMotionConfig>
        {/* ── Hero ── */}
        <section className="bg-primary text-primary-foreground">
          <div className={cn(containerClassName, "flex flex-col gap-12 py-16 lg:flex-row lg:items-center lg:py-20")}>
            <RevealGroup className="flex min-w-0 flex-1 flex-col gap-6">
              <RevealItem>
                <p className="flex items-center gap-2 text-[0.8125rem] font-bold tracking-widest text-primary-foreground/80 uppercase">
                  <MapPin aria-hidden className="size-4 shrink-0 text-yellow-400" />
                  {barangayCity}
                </p>
              </RevealItem>
              <RevealItem>
                <h1 className="text-4xl leading-[1.08] font-bold tracking-tight text-balance sm:text-5xl lg:text-[3.5rem]">
                  Welcome to {barangayName}
                </h1>
              </RevealItem>
              <RevealItem>
                <p className="max-w-140 text-lg leading-relaxed text-pretty text-primary-foreground/80 sm:text-[1.1875rem]">
                  Your one-stop digital portal for barangay services. Access announcements, request documents, report
                  complaints, and connect with your community — all in one place.
                </p>
              </RevealItem>
              <RevealItem className="flex flex-wrap gap-3">
                <SignInButton mode="modal">
                  <Button
                    size="lg"
                    className="h-13 rounded-xl bg-background px-6 text-[1.0625rem] font-bold text-primary-deep hover:bg-background/90"
                  >
                    Log in to access services
                    <ArrowRight className="size-5" />
                  </Button>
                </SignInButton>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-13 rounded-xl border-primary-foreground/50 bg-transparent px-6 text-[1.0625rem] font-semibold text-primary-foreground shadow-none hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <a href="#news">Read the latest news</a>
                </Button>
              </RevealItem>
              <RevealItem>
                <p className="text-[0.9375rem] text-primary-foreground/80">
                  Emergency? Call the barangay hotline at{" "}
                  <a href={toTelHref(hotline1)} className="font-semibold whitespace-nowrap text-primary-foreground underline">
                    {hotline1}
                  </a>
                </p>
              </RevealItem>
            </RevealGroup>

            <Reveal effect="zoom" delay={0.3} className="self-center lg:shrink-0">
              <Float>
                <Image
                  src={barangayLogoSrc}
                  alt={`${barangayName} logo`}
                  width={384}
                  height={384}
                  preload
                  className="size-56 sm:size-72 lg:size-96"
                />
              </Float>
            </Reveal>
          </div>
        </section>

        {/* ── Goal, Mission, Vision ── */}
        <section>
          <div className={cn(sectionClassName, "flex flex-col gap-10")}>
            <SectionIntro
              eyebrow="Who we are"
              title="Our Goal, Mission and Vision"
              className="items-center text-center"
            />
            <RevealGroup stagger={0.15} className="grid gap-6 lg:grid-cols-3">
              {statements.map(({ icon: Icon, label, statement }) => (
                <RevealItem key={label}>
                  <Card className="flex h-full flex-col gap-4 border-0 bg-primary/8 p-8 shadow-none">
                    <span className="flex size-13 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <Icon className="size-6.5" />
                    </span>
                    <h3 className="text-2xl font-bold">{label}</h3>
                    <p className="text-[1.0625rem] leading-relaxed text-pretty text-foreground/80">{statement}</p>
                  </Card>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── News ── */}
        <section id="news" className="scroll-mt-24 overflow-hidden bg-primary/15">
          <div className={cn(sectionClassName, "flex flex-col gap-10")}>
            <div className="flex flex-wrap items-end justify-between gap-5">
              <SectionIntro
                eyebrow="News & announcements"
                title="Latest News and Announcements"
                description={`Stay informed with the latest updates from ${barangayName}.`}
              />
              <Reveal delay={0.3}>
                <Button asChild variant="link" className="h-auto px-0 text-base font-semibold">
                  <Link href="/news">
                    See all news
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </Reveal>
            </div>
            <Reveal delay={0.2}>
              <NewsCarousel />
            </Reveal>
          </div>
        </section>

        {/* ── Officials ── */}
        <section id="officials">
          <div className={cn(sectionClassName, "flex flex-col gap-10")}>
            <SectionIntro
              eyebrow="Sangguniang Barangay"
              title="Barangay Officials"
              description={`Meet the current leaders who serve and support the ${barangayName} community.`}
            />
            <OfficialsShowcase />
          </div>
        </section>

        {/* ── Services ── */}
        <section id="services" className="bg-primary/5">
          <div className={cn(sectionClassName, "flex flex-col gap-10")}>
            <div className="flex flex-wrap items-end justify-between gap-5">
              <SectionIntro
                eyebrow="Community services"
                title="Access Essential Barangay Resources"
                description="Barangay projects are open to everyone. Log in to use the other services."
                className="max-w-160"
              />
              <Reveal delay={0.3}>
                <SignInButton mode="modal">
                  <Button size="lg" className="h-12 rounded-xl px-5 font-bold">
                    <LockKeyhole className="size-4.5" />
                    Log in to continue
                  </Button>
                </SignInButton>
              </Reveal>
            </div>

            <RevealGroup stagger={0.1} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-6">
              {services.map((service) => (
                <ServiceCard key={service.title} service={service} />
              ))}
            </RevealGroup>

            <Reveal>
              <p className="text-[0.9375rem] text-foreground/70">
                No account yet?{" "}
                <SignUpButton mode="modal">
                  <button type="button" className="font-bold text-primary hover:underline">
                    Register as a resident
                  </button>
                </SignUpButton>
                , then complete your resident profile with a valid ID.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── Technological Foundation ── */}
        {/* Clipped sideways so the cards sliding in don't widen the page. */}
        <section className="overflow-x-clip">
          <div className={cn(sectionClassName, "flex flex-col gap-5 lg:py-24")}>
            {/* Column-reversed below lg so the heading comes before the first card. */}
            <div className="flex flex-col-reverse gap-5 lg:flex-row lg:items-end">
              <Reveal effect="left" className="flex flex-1 lg:justify-end">
                <TechCard
                  feature={techFeatures.ai}
                  className="w-full bg-primary text-primary-foreground lg:w-[86%]"
                  descriptionClassName="text-primary-foreground/85"
                />
              </Reveal>
              <Reveal effect="right" delay={0.15} className="flex flex-1 flex-col gap-3 lg:pb-2">
                <p className="text-[0.8125rem] font-bold tracking-widest text-primary uppercase">Behind the portal</p>
                <h2 className="text-4xl leading-[1.08] font-bold tracking-tight sm:text-5xl">Technological Foundation</h2>
                <p className="text-lg text-foreground/70">Leveraging modern tech for a more efficient government.</p>
              </Reveal>
            </div>
            <RevealGroup stagger={0.15} className="grid gap-5 lg:grid-cols-2">
              <RevealItem>
                <TechCard
                  feature={techFeatures.assistant}
                  className="h-full bg-primary-deep text-primary-foreground"
                  descriptionClassName="text-primary-foreground/80"
                />
              </RevealItem>
              <RevealItem>
                <TechCard
                  feature={techFeatures.cloud}
                  className="h-full bg-primary/40 text-primary-deep"
                  descriptionClassName="text-primary-deep/90"
                />
              </RevealItem>
            </RevealGroup>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="bg-primary-deep text-[0.9375rem] text-primary-foreground/80">
          <div className={cn(containerClassName, "flex flex-col gap-10 pt-16 pb-8")}>
            <Reveal className="flex flex-wrap gap-x-14 gap-y-10">
              <div className="flex min-w-0 flex-[2_1_18rem] flex-col gap-4">
                <div className="flex items-center gap-3.5">
                  <Image src={barangayLogoSrc} alt="" width={56} height={56} />
                  <span className="text-[1.375rem] font-bold text-primary-foreground">{barangayName}</span>
                </div>
                <p className="leading-relaxed">{address}</p>
              </div>

              <div className="flex min-w-0 flex-[1_1_12rem] flex-col gap-2.5">
                <h2 className="text-sm font-bold tracking-wider text-primary-foreground uppercase">Contact</h2>
                {hotlines.map((hotline) => (
                  <a key={hotline} href={toTelHref(hotline)} className="self-start hover:text-primary-foreground">
                    {hotline}
                  </a>
                ))}
                <a href={`mailto:${email}`} className="self-start break-all hover:text-primary-foreground">
                  {email}
                </a>
              </div>

              <nav aria-label="Footer" className="flex min-w-0 flex-[1_1_12rem] flex-col gap-2.5">
                <h2 className="text-sm font-bold tracking-wider text-primary-foreground uppercase">Explore</h2>
                {footerLinks.map(({ href, label }) => (
                  <Link key={href} href={href} className="self-start hover:text-primary-foreground">
                    {label}
                  </Link>
                ))}
                <SignInButton mode="modal">
                  <button type="button" className="self-start hover:text-primary-foreground">
                    Log in / Register
                  </button>
                </SignInButton>
              </nav>
            </Reveal>

            <Separator className="bg-primary-foreground/15" />

            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
              <p>
                © {new Date().getFullYear()} {barangayName}, {barangayCity}
              </p>
              <div className="flex gap-5">
                <Link href="/terms" className="hover:text-primary-foreground">
                  Terms of Service
                </Link>
                <Link href="/privacy" className="hover:text-primary-foreground">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </ReducedMotionConfig>
    </main>
  );
}
