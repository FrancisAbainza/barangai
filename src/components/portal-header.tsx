"use client";

import Image from "next/image";
import { Home, Info, Megaphone, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { Show, SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Separator } from "./ui/separator";
import { barangayLogoSrc, barangayName } from "@/lib/data";

const publicNavLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/news", label: "News", icon: Megaphone },
  { href: "/about-us", label: "About Us", icon: Info },
];

export default function PortalHeader() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const { isSignedIn } = useUser();

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 border-b border-border bg-card py-2 px-4 ${isSignedIn && "md:hidden"}`}>
      <div className="container flex h-full m-auto items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src={barangayLogoSrc}
            alt={`${barangayName} logo`}
            width={50}
            height={50}
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Republic of the Philippines
            </p>
            <p className="text-base font-bold leading-tight text-foreground">
              {barangayName}
            </p>
          </div>
        </div>
        <Show when="signed-in">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <Menu className="h-5 w-5" />
          </Button>
        </Show>
        <Show when="signed-out">
          <nav className="hidden sm:flex items-center gap-1">
            {publicNavLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden">
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
                  <SignInButton>
                    <Button variant="outline" size="sm" className="text-sm px-8 bg-transparent">
                      Sign In
                    </Button>
                  </SignInButton>
                  <SignUpButton>
                    <Button size="sm" className="text-sm px-8">
                      Sign Up
                    </Button>
                  </SignUpButton>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </Show>
      </div>
    </header>
  );
}
