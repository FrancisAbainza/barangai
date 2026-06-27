import LandingPageHeader from "@/components/landing-page-header";
import { Button } from "@/components/ui/button";
import { barangayName } from "@/lib/data";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { FileText, Info, Newspaper, Shield, SportShoe, Store } from "lucide-react";

const getFeatures = [
  {
    icon: Newspaper,
    title: "News & Announcements",
    description:
      `Stay up-to-date with the latest news, events, and official notices from ${barangayName}.`,
    badge: "Community",
  },
  {
    icon: FileText,
    title: "Document Request",
    description:
      "Request barangay certificates, clearances, and other official documents online — no need to queue.",
    badge: "Services",
  },
  {
    icon: Store,
    title: "Community Hub",
    description:
      "Discover and support local businesses in our business directory.",
    badge: "Education",
  },
  {
    icon: SportShoe,
    title: "Court Reservation",
    description:
      "Online sports court booking with real-time schedule checks.",
    badge: "Safety",
  },
  {
    icon: Info,
    title: "Complaint Reporting",
    description:
      "Dedicated portal for hazard reporting and civic complaints.",
    badge: "Governance",
  },
  {
    icon: Shield,
    title: "Security",
    description:
      "Real-time tanod GPS tracking and emergency assistance requests.",
    badge: "Security",
  },
];

export default function Home() {
  return (
    <>
      <LandingPageHeader />
      <div className="container mt-40 mx-auto">
        <SignInButton mode="modal">
          <Button variant="outline" size="sm" className="text-sm px-8 bg-transparent">
            Sign In
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button size="sm" className="text-sm px-8">
            Sign Up
          </Button>
        </SignUpButton>
      </div>
    </>
  );
}
