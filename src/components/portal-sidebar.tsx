"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChartColumn,
  Home,
  Megaphone,
  FileText,
  MessageSquareWarning,
  Eye,
  Info,
  Users,
  Store,
  SportShoe,
  ScrollText,
  Shield,
  User,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { barangayLogoSrc, barangayName } from "@/lib/data";
import { isAdminRole, isSuperAdminRole } from "@/lib/roles";
import { getUnreadNotificationCount } from "@/actions/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NOTIFICATIONS_HREF = "/portal/notifications";

type MenuItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  // Who sees the item. Unset means everyone.
  audience?: "resident" | "admin" | "superadmin";
};

const menuGroups: { label: string; items: MenuItem[] }[] = [
  {
    label: "Overview",
    items: [
      { title: "Home", href: "/portal", icon: Home },
      { title: "Notifications", href: NOTIFICATIONS_HREF, icon: Bell, audience: "resident" },
      { title: "Analytics", href: "/portal/analytics", icon: ChartColumn, audience: "admin" },
    ],
  },
  {
    label: "Services",
    items: [
      { title: "Document Request", href: "/portal/document-request", icon: FileText },
      { title: "Complaint", href: "/portal/complaint", icon: MessageSquareWarning },
      { title: "Court Reservation", href: "/portal/court-reservation", icon: SportShoe },
    ],
  },
  {
    label: "Community",
    items: [
      { title: "News & Announcements", href: "/portal/news", icon: Megaphone },
      { title: "Community Hub", href: "/portal/community-hub", icon: Store },
      { title: "Transparency", href: "/portal/transparency", icon: Eye },
      { title: "About Us", href: "/portal/about-us", icon: Info },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "User Management", href: "/portal/user-management", icon: Users, audience: "admin" },
      { title: "Barangay Settings", href: "/portal/barangay-settings", icon: Settings, audience: "admin" },
      { title: "Audit Logs", href: "/portal/audit-logs", icon: ScrollText, audience: "superadmin" },
    ],
  },
];

export default function PortalSidebar() {
  const pathname = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { user } = useUser();
  const collapsed = state === "collapsed";

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);
  const isSuperAdmin = isSuperAdminRole(user?.publicMetadata?.role as string | undefined);
  const canSee = ({ audience }: MenuItem) =>
    audience === "resident" ? !isAdmin : audience === "admin" ? isAdmin : audience === "superadmin" ? isSuperAdmin : true;
  // Groups left with no items for this role (Administration for residents) are dropped.
  const visibleGroups = menuGroups
    .map((group) => ({ ...group, items: group.items.filter(canSee) }))
    .filter((group) => group.items.length > 0);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => getUnreadNotificationCount(),
    enabled: !!user && !isAdmin,
    refetchInterval: 60_000,
  });
  const fullName = user?.fullName ?? "User";

  return (
    <>
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
        <SidebarContent className="gap-0">
          {visibleGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-[0.65rem] uppercase tracking-wider text-sidebar-foreground/50">{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  // Subpages (e.g. a post at /portal/news/[id]) keep their section active. Home is
                  // "/portal" itself, which every page is under, so it only matches exactly.
                  const isActive =
                    pathname === item.href || (item.href !== "/portal" && pathname.startsWith(`${item.href}/`));

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={collapsed ? item.title : undefined}
                        className="gap-3"
                      >
                        <Link href={item.href} onClick={handleNavClick}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.href === NOTIFICATIONS_HREF && unreadCount > 0 && (
                        <SidebarMenuBadge className="bg-primary text-primary-foreground peer-hover/menu-button:text-primary-foreground peer-data-active/menu-button:text-primary-foreground">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        {/* User Section */}
        <SidebarFooter className="border-t border-sidebar-border">
          <div className={cn("flex w-full items-center justify-center gap-3 px-4", collapsed && "flex-col gap-2")}>
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Link
                  label="My Profile"
                  labelIcon={<User className="size-4" />}
                  href={`/portal/profile/${user?.id}`}
                />
              </UserButton.MenuItems>
            </UserButton>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{fullName}</p>
                <p className="truncate text-xs text-sidebar-foreground/60">
                  {isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : "Resident"}
                </p>
              </div>
            )}
            <ThemeToggle />
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarTrigger className="p-4 hidden md:flex" />
    </>
  );
}
