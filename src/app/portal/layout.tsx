import { AiAssistantWidget } from "@/components/ai-assistant-widget";
import PortalHeader from "@/components/portal-header";
import PortalSidebar from "@/components/portal-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

// Raised for the AI assistant's knowledge base upload — parsing, chunking, and
// embedding a full PDF (src/actions/knowledge-base.ts) can exceed the default limit.
export const maxDuration = 60;

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen className="h-svh overflow-hidden">
      <PortalSidebar />
      <SidebarInset className="flex flex-1 flex-col overflow-y-auto">
        <PortalHeader />
        <main className="px-6 py-20 md:py-6 md:pb-30">
          {children}
        </main>
      </SidebarInset>
      <AiAssistantWidget />
    </SidebarProvider>
  );
}
