"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Megaphone,
  FileText,
  MessageSquareWarning,
  Eye,
  Info,
  Users,
  Store,
  SportShoe,
  Shield,
} from "lucide-react";
import { useUser, UserButton, Show } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { barangayLogoSrc, barangayName } from "@/lib/data";

const residentMenuItems = [
  { title: "Home", href: "/home", icon: Home },
  { title: "News", href: "/news", icon: Megaphone },
  { title: "Document Request", href: "/document-request", icon: FileText },
  { title: "Community Hub", href: "/community-hub", icon: Store },
  { title: "Court Reservation", href: "/court-reservation", icon: SportShoe },
  { title: "Complaint", href: "/complaint", icon: MessageSquareWarning },
  { title: "Transparency", href: "/transparency", icon: Eye },
  { title: "Security", href: "/security", icon: Shield },
  { title: "About Us", href: "/about-us", icon: Info },
];

const adminMenuItems = [
  ...residentMenuItems,
  { title: "User Management", href: "/dashboard/user-management", icon: Users },
];

export default function PortalSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { user, isLoaded, isSignedIn } = useUser();
  const collapsed = state === "collapsed";

  const isAdmin = user?.publicMetadata?.role === "admin";
  const menuItems = isAdmin ? adminMenuItems : residentMenuItems;

  const fullName = user?.fullName ?? "User";

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <Show when="signed-in">
      <Sidebar collapsible="icon" className="hidden md:flex border-r-0">
        {/* Header */}
        {!collapsed && (
          <SidebarHeader className="flex flex-row items-center justify-center border-b border-sidebar-border py-4">
            <div className="flex flex-col items-center gap-2">
              <Image
                src={barangayLogoSrc}
                alt={`${barangayName} logo`}
                width={150}
                height={150}
              />
              <span className="font-semibold text-sm">{barangayName} Website</span>
            </div>

          </SidebarHeader>
        )}
        {/* Navigation */}
        <SidebarContent>
          <SidebarMenu className="p-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={collapsed ? item.title : undefined}
                    className="gap-3"
                  >
                    <Link href={item.href}>
                      <Icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        {/* User Section */}
        <SidebarFooter className="border-t border-sidebar-border px-5 py-2">
          <div className="flex w-full items-center gap-3">
            <UserButton />
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{fullName}</p>
                <p className="truncate text-xs text-sidebar-foreground/60">{isAdmin ? "Admin": "Resident"}</p>
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarTrigger className="p-4 hidden md:flex" />
    </Show>
  );
}
