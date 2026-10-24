"use client";

import Image from "next/image";
import { Home, Info, Megaphone, Menu, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Separator } from "./ui/separator";
import { barangayCity, barangayLogoSrc, barangayName } from "@/lib/data";

const publicNavLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/news", label: "News", icon: Megaphone },
  { href: "/about-us", label: "About Us", icon: Info },
];

export default function LandingPageHeader() {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex w-full items-center justify-between gap-4 px-6 py-3 md:container">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src={barangayLogoSrc}
            alt={`${barangayName} logo`}
            width={56}
            height={56}
            className="size-11 sm:size-14"
          />
          <div>
            <p className="text-[0.6875rem] tracking-wider text-muted-foreground uppercase sm:text-xs">
              Republic of the Philippines
            </p>
            <p className="text-lg leading-tight font-bold sm:text-xl">{barangayName}</p>
            <p className="text-xs text-muted-foreground sm:text-sm">{barangayCity}</p>
          </div>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {publicNavLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "border-b-3 py-2.5 font-medium transition-colors",
                pathname === href ? "border-primary" : "border-transparent hover:border-primary/30",
              )}
            >
              {label}
            </Link>
          ))}
          <div className="flex items-center gap-2.5">
            <SignInButton mode="modal">
              <Button
                variant="outline"
                size="lg"
                className="h-11 rounded-xl border-primary px-4 font-semibold text-primary hover:bg-primary/5 hover:text-primary"
              >
                <UserRound className="size-5" />
                Log in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="lg" className="h-11 rounded-xl px-4 font-semibold">
                Register
              </Button>
            </SignUpButton>
          </div>
        </nav>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            {/* Sidebar-style branding header */}
            <SheetHeader className="flex flex-col items-center gap-2 border-b border-border py-4 px-4">
              <Image
                src={barangayLogoSrc}
                alt={`${barangayName} logo`}
                width={100}
                height={100}
              />
              <SheetTitle className="text-sm font-semibold">
                {barangayName} Website
              </SheetTitle>
            </SheetHeader>

            {/* Navigation — sidebar menu style */}
            <nav className="flex-1 flex flex-col gap-1 p-2">
              {publicNavLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsSheetOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <Separator />

            {/* CTA footer */}
            <div className="px-4 pb-4">
              <p className="text-xs text-muted-foreground mb-3 text-center">
                Log in to access barangay services
              </p>
              <div className="flex flex-col gap-2">
                {/* Close the sheet first so its focus trap doesn't block the Clerk modal */}
                <SignInButton mode="modal">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-sm px-8 bg-transparent"
                    onClick={() => setIsSheetOpen(false)}
                  >
                    Log in
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm" className="text-sm px-8" onClick={() => setIsSheetOpen(false)}>
                    Register
                  </Button>
                </SignUpButton>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
