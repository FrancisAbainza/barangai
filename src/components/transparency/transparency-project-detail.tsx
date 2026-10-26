"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye } from "lucide-react";
import EmptyState from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { getTransparencyProjectById, type TransparencyProjectWithAuthor } from "@/actions/transparency";
import TransparencyProjectCard from "./transparency-project-card";

// One project in the portal (/portal/transparency/[id]). It's cached under ["transparency-projects"]
// like the list, so the card's reactions, edits and deletes refresh it too.
export default function TransparencyProjectDetail({
  initialProject,
}: {
  initialProject: TransparencyProjectWithAuthor;
}) {
  const { data: project } = useQuery({
    queryKey: ["transparency-projects", "project", initialProject.id],
    queryFn: () => getTransparencyProjectById(initialProject.id),
    initialData: initialProject,
  });

  return (
    <div className="mx-auto w-full space-y-4 md:max-w-2xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2 gap-2">
        <Link href="/portal/transparency">
          <ArrowLeft className="size-4" />
          Back to Transparency
        </Link>
      </Button>
      {project ? (
        <TransparencyProjectCard project={project} />
      ) : (
        <EmptyState icon={Eye} title="Project not found" description="This project has been deleted." />
      )}
    </div>
  );
}
