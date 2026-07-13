"use client";

import { useUser } from "@clerk/nextjs";
import { barangayName } from "@/lib/data";

interface WelcomeBannerProps {
  description?: string;
}

export default function WelcomeBanner({
  description = "Track your requests, stay updated with the latest news, and access barangay services all in one place.",
}: WelcomeBannerProps) {
  const { user, isLoaded } = useUser();

  return (
    <div
      className="rounded-xl border border-border p-6 text-white shadow-sm sm:p-8"
      style={{
        background:
          "linear-gradient(135deg, rgba(0, 56, 168, 0.9) 0%, rgba(0, 56, 168, 0.7) 40%, rgba(206, 17, 38, 0.7) 100%)",
      }}
    >
      <p className="text-sm font-medium uppercase tracking-widest text-white/70">{barangayName}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
        Welcome back{isLoaded && user?.firstName ? `, ${user.firstName}` : ""}!
      </h1>
      <p className="mt-2 max-w-xl text-sm text-white/80">{description}</p>
    </div>
  );
}
