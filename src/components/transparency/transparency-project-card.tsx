"use client";

import { useState } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Briefcase,
  GraduationCap,
  HardHat,
  HeartHandshake,
  HeartPulse,
  Leaf,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDateTime } from "@/lib/utils";
import { isSuperAdminRole, roleLabel } from "@/lib/roles";
import { setTransparencyProjectReaction } from "@/actions/transparency";
import type { TransparencyProjectPage, TransparencyProjectWithAuthor } from "@/actions/transparency";
import { MediaGrid, AttachmentList } from "@/components/media-gallery";
import MapView from "@/components/map-view";
import type { LocationValue } from "@/components/map-picker";
import { TRANSPARENCY_CATEGORIES } from "@/schemas/transparency-schema";
import EditTransparencyProjectDialog from "./edit-transparency-project-dialog";
import DeleteTransparencyProjectDialog from "./delete-transparency-project-dialog";
import TransparencyCommentsDialog from "./transparency-comments-dialog";

const CATEGORY_CONFIG: Record<(typeof TRANSPARENCY_CATEGORIES)[number], { icon: LucideIcon; className: string }> = {
  Infrastructure: { icon: HardHat, className: "bg-amber-600 text-white hover:bg-amber-600" },
  Health: { icon: HeartPulse, className: "bg-red-600 text-white hover:bg-red-600" },
  Education: { icon: GraduationCap, className: "bg-blue-600 text-white hover:bg-blue-600" },
  Livelihood: { icon: Briefcase, className: "bg-purple-600 text-white hover:bg-purple-600" },
  "Social Welfare": { icon: HeartHandshake, className: "bg-pink-600 text-white hover:bg-pink-600" },
  "Peace and Order": { icon: ShieldCheck, className: "bg-indigo-600 text-white hover:bg-indigo-600" },
  Environment: { icon: Leaf, className: "bg-green-700 text-white hover:bg-green-700" },
  Others: { icon: Tag, className: "bg-gray-600 text-white hover:bg-gray-600" },
};

function formatBudget(budget: string | null): string | null {
  if (!budget) return null;
  const amount = Number(budget);
  if (Number.isNaN(amount)) return null;
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

function LocationDialog({ location }: { location: LocationValue }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <MapPin className="size-4" />
        View Location
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Project Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {location.address && <p className="text-sm text-muted-foreground">{location.address}</p>}
            <MapView location={location} className="h-128" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TransparencyProjectCardMenu({ project }: { project: TransparencyProjectWithAuthor }) {
  const { user } = useUser();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isSuperAdmin = isSuperAdminRole(user?.publicMetadata?.role as string | undefined);
  if (user?.id !== project.authorId && !isSuperAdmin) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 shrink-0">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditTransparencyProjectDialog project={project} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteTransparencyProjectDialog project={project} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}

function ReactionButtons({ project }: { project: TransparencyProjectWithAuthor }) {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (type: "like" | "dislike") => setTransparencyProjectReaction(project.id, type),
    onMutate: async (type) => {
      await queryClient.cancelQueries({ queryKey: ["transparency-projects"] });
      const previousQueries = queryClient.getQueriesData<InfiniteData<TransparencyProjectPage, number>>({
        queryKey: ["transparency-projects"],
      });

      queryClient.setQueriesData<InfiniteData<TransparencyProjectPage, number>>(
        { queryKey: ["transparency-projects"] },
        (old) => {
          if (!old) return old;

          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => {
                if (item.id !== project.id) return item;

                const current = item.userReaction;
                let { likeCount, dislikeCount } = item;

                if (current === "like") likeCount -= 1;
                if (current === "dislike") dislikeCount -= 1;

                if (current === type) {
                  return { ...item, likeCount, dislikeCount, userReaction: null };
                }

                if (type === "like") likeCount += 1;
                else dislikeCount += 1;

                return { ...item, likeCount, dislikeCount, userReaction: type };
              }),
            })),
          };
        }
      );

      return { previousQueries };
    },
    onError: (_err, _type, context) => {
      context?.previousQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error("Failed to update your reaction. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["transparency-projects"] });
    },
  });

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={!user || isPending}
        onClick={() => mutate("like")}
        className={cn(
          "flex-1 gap-2 text-muted-foreground",
          project.userReaction === "like" && "text-blue-600 hover:text-blue-600"
        )}
      >
        <ThumbsUp className={cn("size-4", project.userReaction === "like" && "fill-current")} />
        <span className="hidden md:inline">
          Like{project.likeCount > 0 ? ` (${project.likeCount})` : ""}
        </span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={!user || isPending}
        onClick={() => mutate("dislike")}
        className={cn(
          "flex-1 gap-2 text-muted-foreground",
          project.userReaction === "dislike" && "text-red-600 hover:text-red-600"
        )}
      >
        <ThumbsDown className={cn("size-4", project.userReaction === "dislike" && "fill-current")} />
        <span className="hidden md:inline">
          Dislike{project.dislikeCount > 0 ? ` (${project.dislikeCount})` : ""}
        </span>
      </Button>
    </>
  );
}

function CommentButton({ project }: { project: TransparencyProjectWithAuthor }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="flex-1 gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="size-4" />
        <span className="hidden md:inline">
          Comment{project.commentCount > 0 ? ` (${project.commentCount})` : ""}
        </span>
      </Button>

      <TransparencyCommentsDialog project={project} open={open} onOpenChange={setOpen} />
    </>
  );
}

export default function TransparencyProjectCard({ project }: { project: TransparencyProjectWithAuthor }) {
  const categoryConfig = CATEGORY_CONFIG[project.category];
  const CategoryIcon = categoryConfig.icon;
  const formattedBudget = formatBudget(project.budget);

  return (
    <Card>
      <CardHeader className="p-4 pb-3 flex-row items-start justify-between gap-2 space-y-0">
        <div className="flex items-center gap-3">
          <div className="relative size-10 rounded-full overflow-hidden bg-muted shrink-0">
            {project.authorImageUrl && (
              <Image
                src={project.authorImageUrl}
                alt={project.authorName}
                fill
                className="object-cover"
                unoptimized
              />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">{project.authorName}</p>
            <p className="text-xs text-muted-foreground">
              {roleLabel(project.authorRole)} &middot; {formatDateTime(new Date(project.createdAt))}
            </p>
          </div>
        </div>
        <TransparencyProjectCardMenu project={project} />
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        <Badge className={cn("gap-1.5 rounded-full", categoryConfig.className)}>
          <CategoryIcon className="size-3" />
          {project.category}
        </Badge>

        <h3 className="font-bold text-base">{project.title}</h3>

        <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>

        {(formattedBudget || project.location) && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {formattedBudget && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Wallet className="size-3.5" />
                {formattedBudget}
              </span>
            )}
            {project.location && <LocationDialog location={project.location} />}
          </div>
        )}

        <MediaGrid media={project.media} />

        <AttachmentList attachments={project.attachments} />
      </CardContent>

      <CardFooter className="px-1 pb-1 pt-1 border-t gap-0">
        <ReactionButtons project={project} />
        <CommentButton project={project} />
      </CardFooter>
    </Card>
  );
}
