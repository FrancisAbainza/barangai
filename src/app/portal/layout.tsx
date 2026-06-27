import PortalHeader from "@/components/portal-header";
import PortalSidebar from "@/components/portal-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen className="h-svh overflow-hidden">
      <PortalSidebar />
      <SidebarInset className="flex flex-1 flex-col overflow-y-auto">
        <PortalHeader />
        <main className="px-6 py-20 md:py-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
