import LandingPageHeader from "@/components/landing-page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { barangayLogoSrc, barangayName } from "@/lib/data";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  AlertTriangle,
  Brain,
  Calendar,
  Cloud,
  FileText,
  Globe,
  Mail,
  MapPin,
  Mic,
  Newspaper,
  Phone,
  Store,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const communityServices = [
  {
    icon: Newspaper,
    title: "News & Announcements",
    description:
      "Stay updated on latest events, announcements, and programs.",
  },
  {
    icon: FileText,
    title: "Document Request",
    description:
      "Seamless online application and processing of barangay certificates.",
  },
  {
    icon: Store,
    title: "Community Hub",
    description:
      "Discover and support local businesses in our business directory.",
  },
  {
    icon: Calendar,
    title: "Court Reservation",
    description: "Online sports court booking with real-time schedule checks.",
  },
  {
    icon: AlertTriangle,
    title: "Complaint Reporting",
    description: "Dedicated portal for hazard reporting and civic complaints.",
  },
  {
    icon: MapPin,
    title: "Tanod Tracking",
    description:
      "Real-time GPS tracking and emergency assistance requests.",
  },
];

const techFeatures = [
  {
    icon: Brain,
    title: "Artificial Intelligence",
    description:
      "Automated triage for citizen concerns and predictive analysis for community resource management.",
  },
  {
    icon: Mic,
    title: "Voice-Powered Assistant",
    description:
      "Hands-free accessibility for senior citizens and disabled residents to access government news and services.",
  },
  {
    icon: Cloud,
    title: "Cloud-Based Infrastructure",
    description:
      "Secure, scalable, and real-time document storage ensuring 24/7 availability of your vital records.",
  },
];

export default function Home() {
  return (
    <>
      <LandingPageHeader />

      <main className="pt-16">
        {/* ── Hero ── */}
        <section
          className="flex flex-col items-center justify-center text-center py-20 px-4"
          style={{
            background:
              "linear-gradient(135deg, rgba(0, 56, 168, 0.7) 0%, transparent 30%, transparent 70%, rgba(206, 17, 38, 0.7) 100%)",
          }}
        >
          <div className="rounded-full overflow-hidden mb-8 w-40 h-40 relative shrink-0">
            <Image
              src={barangayLogoSrc}
              alt={`${barangayName} logo`}
              fill
            />
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 max-w-2xl leading-tight">
            Welcome to {barangayName} Official Website
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mb-8 leading-relaxed">
            Your one-stop digital portal for barangay services. Access
            announcements, request documents, report complaints, and connect
            with your community — all in one place.
          </p>
          <div className="flex gap-3">
            <SignInButton mode="modal">
              <Button size="lg">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="lg" variant="outline">
                Sign Up
              </Button>
            </SignUpButton>
          </div>
        </section>

        {/* ── Emergency Hotlines Banner ── */}
        <div className="bg-foreground text-background py-4 px-4">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="font-bold text-sm tracking-widest">
              EMERGENCY HOTLINES
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
              <span>
                POLICE{" "}
                <strong className="font-semibold">911</strong>
              </span>
              <span className="opacity-40">·</span>
              <span>
                FIRE{" "}
                <strong className="font-semibold">122</strong>
              </span>
              <span className="opacity-40">·</span>
              <span>
                HALL{" "}
                <strong className="font-semibold">0905 123 4567</strong>
              </span>
            </div>
          </div>
        </div>

        {/* ── Community Services ── */}
        <section className="py-16 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold">
                Community Services
              </h2>
              <p className="text-muted-foreground mt-2">
                Access essential barangay resources and digital tools.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {communityServices.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <Icon className="h-7 w-7 text-primary mb-2" />
                    <CardTitle className="text-base">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1 pt-0">
                    <p className="text-muted-foreground text-sm flex-1">
                      {description}
                    </p>
                    <Link
                      href="#"
                      className="text-sm text-primary font-medium mt-5 hover:underline inline-block"
                    >
                      View Details →
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Technological Foundation ── */}
        <section className="bg-muted py-16 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold">
                Technological Foundation
              </h2>
              <p className="text-muted-foreground mt-2">
                Leveraging modern tech for a more efficient government.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {techFeatures.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex flex-col items-center text-center gap-3 p-6 rounded-xl bg-card/60 border border-border/40"
                >
                  <Icon className="h-7 w-7 text-primary" />
                  <h3 className="font-semibold text-base">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── About / CTA Banner ── */}
        <section className="py-16 px-4">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-10 rounded-2xl border border-border bg-card p-8 md:p-12 shadow-sm">
              <div className="flex-1 space-y-5">
                <h2 className="text-2xl sm:text-3xl font-bold leading-snug">
                  Secure, Transparent, and Accessible Services for Everyone.
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Barangay Maduya is pioneering the digital transformation of
                  local government units. We are building a modern ecosystem
                  that serves the people first.
                </p>
                <Button variant="outline">LEARN MORE ABOUT US</Button>
              </div>
              <div className="flex-1 w-full">
                <Image
                  src="https://placehold.co/600x400"
                  alt="About Barangay Maduya"
                  width={600}
                  height={400}
                  className="rounded-xl w-full object-cover"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-border py-12 px-4">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
              {/* Col 1 — Brand */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Image
                    src={barangayLogoSrc}
                    alt={`${barangayName} logo`}
                    width={40}
                    height={40}
                  />
                  <span className="font-bold text-sm">{barangayName}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Leading the way in digital community governance for a smarter
                  tomorrow.
                </p>
                <Link
                  href="#"
                  aria-label="Facebook"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Globe className="h-5 w-5" />
                </Link>
              </div>

              {/* Col 2 — Services */}
              <div className="space-y-3">
                <h4 className="font-semibold text-xs uppercase tracking-widest">
                  SERVICES
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    "Document Request",
                    "Court Reservation",
                    "Complaint Reporting",
                    "Business Hub",
                  ].map((item) => (
                    <li key={item}>
                      <Link
                        href="#"
                        className="hover:text-foreground transition-colors"
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Col 3 — Organization */}
              <div className="space-y-3">
                <h4 className="font-semibold text-xs uppercase tracking-widest">
                  ORGANIZATION
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    "About Us",
                    "News",
                    "Privacy Policy",
                    "Terms of Service",
                  ].map((item) => (
                    <li key={item}>
                      <Link
                        href="#"
                        className="hover:text-foreground transition-colors"
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Col 4 — Contact */}
              <div className="space-y-3">
                <h4 className="font-semibold text-xs uppercase tracking-widest">
                  CONTACT US
                </h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span>contact@barangaymaduya.gov</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>+63 (2) 8888-0000</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Barangay Hall, Maduya, Carmona, Cavite</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                © 2026 Barangay Maduya. Official Barangay Portal.
              </span>
              <span>Republic of the Philippines</span>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
