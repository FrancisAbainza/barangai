import { notFound } from "next/navigation";
import TransparencyProjectDetail from "@/components/transparency/transparency-project-detail";
import { getTransparencyProjectById } from "@/actions/transparency";

// Where signed-in users land from a /transparency/[id] share link (src/proxy.ts) and the AI
// assistant's project buttons, so the portal layout and the assistant stay mounted.
export default async function PortalTransparencyProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const project = Number.isNaN(id) ? null : await getTransparencyProjectById(id);
  if (!project) notFound();

  return <TransparencyProjectDetail initialProject={project} />;
}
