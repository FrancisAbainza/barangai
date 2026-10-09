"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
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
  User,
  Settings,
} from "lucide-react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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

const NOTIFICATIONS_HREF = "/portal/notifications";

const sharedMenuItems = [
  { title: "News & Announcements", href: "/portal/news", icon: Megaphone },
  { title: "Document Request", href: "/portal/document-request", icon: FileText },
  { title: "Community Hub", href: "/portal/community-hub", icon: Store },
  { title: "Court Reservation", href: "/portal/court-reservation", icon: SportShoe },
  { title: "Complaint", href: "/portal/complaint", icon: MessageSquareWarning },
  { title: "Transparency", href: "/portal/transparency", icon: Eye },
  { title: "About Us", href: "/portal/about-us", icon: Info },
];

const residentMenuItems = [
  { title: "Home", href: "/portal", icon: Home },
  { title: "Notifications", href: NOTIFICATIONS_HREF, icon: Bell },
  ...sharedMenuItems,
];

const adminMenuItems = [
  { title: "Home", href: "/portal", icon: Home },
  ...sharedMenuItems,
  { title: "User Management", href: "/portal/user-management", icon: Users },
  { title: "Barangay Settings", href: "/portal/barangay-settings", icon: Settings },
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
  const menuItems = isAdmin ? adminMenuItems : residentMenuItems;

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
        </SidebarContent>

        {/* User Section */}
        <SidebarFooter className="border-t border-sidebar-border">
          <div className="flex w-full items-center justify-center gap-3">
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
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{fullName}</p>
                <p className="truncate text-xs text-sidebar-foreground/60">
                  {isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : "Resident"}
                </p>
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarTrigger className="p-4 hidden md:flex" />
    </>
  );
}
