import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import TransparencyProjectCard from "@/components/transparency/transparency-project-card";
import { getTransparencyProjectById } from "@/actions/transparency";
import { fetchFile } from "@/lib/storage";
import { barangayName } from "@/lib/data";

async function getOrigin() {
  const headersList = await headers();
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${headersList.get("host")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = Number((await params).id);
  const project = Number.isNaN(id) ? null : await getTransparencyProjectById(id);
  if (!project) return {};

  const origin = await getOrigin();
  const description =
    project.description.length > 200 ? `${project.description.slice(0, 200)}…` : project.description;
  const image = project.media.find((item) => item.type === "image");

  return {
    title: `${project.title} · ${barangayName}`,
    description,
    openGraph: {
      title: project.title,
      description,
      url: `${origin}/transparency/${project.id}`,
      images: image?.key ? [`${origin}${fetchFile(image.key)}`] : undefined,
    },
  };
}

export default async function TransparencyProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  const project = Number.isNaN(id) ? null : await getTransparencyProjectById(id);
  if (!project) notFound();

  return (
    <div className="w-full md:max-w-2xl space-y-4 m-auto px-6 py-20">
      <Button variant="ghost" size="sm" asChild className="-ml-2 gap-2">
        <Link href="/transparency">
          <ArrowLeft className="size-4" />
          Back to Transparency
        </Link>
      </Button>
      <TransparencyProjectCard project={project} />
    </div>
  );
}
