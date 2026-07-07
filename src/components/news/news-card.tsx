"use client";

import { useState } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar, Download, FileText, Megaphone, MessageSquare, MoreHorizontal, Pencil, Pin, Play, Plus, Share2, ThumbsDown, ThumbsUp, Trash2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { isSuperAdminRole, roleLabel } from "@/lib/roles";
import { fetchFile } from "@/lib/storage";
import { setNewsReaction } from "@/actions/news";
import type { NewsPage, NewsWithAuthor } from "@/actions/news";
import type { MediaItem } from "@/components/file-uploader";
import EditNewsDialog from "./edit-news-dialog";
import DeleteNewsDialog from "./delete-news-dialog";
import CommentsDialog from "./comments-dialog";

const CATEGORY_CONFIG = {
  Announcement: { icon: Megaphone, className: "bg-green-700 text-white hover:bg-green-700" },
  Event: { icon: Calendar, className: "bg-blue-600 text-white hover:bg-blue-600" },
  Emergency: { icon: TriangleAlert, className: "bg-red-600 text-white hover:bg-red-600" },
} as const;

function formatDate(date: Date): string {
  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${dateStr} at ${timeStr}`;
}

function MediaViewerDialog({
  media,
  startIndex,
  open,
  onOpenChange,
}: {
  media: NewsWithAuthor["media"];
  startIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl border-none bg-black p-0 text-white sm:max-w-3xl overflow-hidden **:data-[slot=dialog-close]:bg-black/50 **:data-[slot=dialog-close]:text-white **:data-[slot=dialog-close]:hover:bg-black/70"
        showCloseButton
      >
        <DialogTitle className="sr-only">Media viewer</DialogTitle>
        <Carousel opts={{ startIndex, loop: media.length > 1 }} className="w-full">
          <CarouselContent className="ml-0">
            {media.map((item, index) => {
              const url = item.key ? fetchFile(item.key) : "";
              return (
                <CarouselItem key={index} className="flex items-center justify-center pl-0">
                  <div className="relative aspect-video w-full">
                    {item.type === "video" ? (
                      <video
                        src={url}
                        controls
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Image
                        src={url}
                        alt={item.name}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    )}
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          {media.length > 1 && (
            <>
              <CarouselPrevious className="left-4 text-foreground" />
              <CarouselNext className="right-4 text-foreground" />
            </>
          )}
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}

function MediaGrid({ media }: { media: NewsWithAuthor["media"] }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  if (!media.length) return null;

  const items = media.slice(0, 2);
  const remainingCount = media.length - items.length;

  const openViewer = (index: number) => {
    setStartIndex(index);
    setViewerOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          "grid gap-0.5 rounded-lg overflow-hidden",
          items.length === 1 ? "grid-cols-1" : "grid-cols-2"
        )}
      >
        {items.map((item, index) => {
          const url = item.key ? fetchFile(item.key) : "";
          const showMoreOverlay = index === items.length - 1 && remainingCount > 0;

          return (
            <button
              key={index}
              type="button"
              onClick={() => openViewer(index)}
              className="relative aspect-video bg-muted block w-full p-0 border-0 cursor-pointer min-h-[250px]"
            >
              {item.type === "video" ? (
                <>
                  <video src={url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/80 rounded-full p-3">
                      <Play className="size-5 fill-current" />
                    </div>
                  </div>
                </>
              ) : (
                <Image src={url} alt={item.name} fill className="object-cover" unoptimized />
              )}
              {showMoreOverlay && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <span className="flex items-center gap-1 text-2xl font-semibold text-white">
                    <Plus className="size-6" />
                    {remainingCount}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <MediaViewerDialog
        media={media}
        startIndex={startIndex}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </>
  );
}

function DownloadableAttachment({ item }: { item: MediaItem }) {
  const handleClick = () => {
    if (!item.key) return;
    window.open(fetchFile(item.key), "_blank");
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
    >
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate flex-1">{item.name}</span>
      <Download className="size-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

function NewsCardMenu({ news }: { news: NewsWithAuthor }) {
  const { user } = useUser();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isSuperAdmin = isSuperAdminRole(user?.publicMetadata?.role as string | undefined);
  if (user?.id !== news.authorId && !isSuperAdmin) return null;

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

      <EditNewsDialog news={news} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteNewsDialog news={news} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}

function ReactionButtons({ news }: { news: NewsWithAuthor }) {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (type: "like" | "dislike") => setNewsReaction(news.id, type),
    onMutate: async (type) => {
      await queryClient.cancelQueries({ queryKey: ["news"] });
      const previousNews = queryClient.getQueryData<InfiniteData<NewsPage, number>>(["news"]);

      queryClient.setQueryData<InfiniteData<NewsPage, number>>(["news"], (old) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.id !== news.id) return item;

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
      });

      return { previousNews };
    },
    onError: (_err, _type, context) => {
      if (context?.previousNews) {
        queryClient.setQueryData(["news"], context.previousNews);
      }
      toast.error("Failed to update your reaction. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
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
          news.userReaction === "like" && "text-blue-600 hover:text-blue-600"
        )}
      >
        <ThumbsUp className={cn("size-4", news.userReaction === "like" && "fill-current")} />
        <span className="hidden md:inline">
          Like{news.likeCount > 0 ? ` (${news.likeCount})` : ""}
        </span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={!user || isPending}
        onClick={() => mutate("dislike")}
        className={cn(
          "flex-1 gap-2 text-muted-foreground",
          news.userReaction === "dislike" && "text-red-600 hover:text-red-600"
        )}
      >
        <ThumbsDown className={cn("size-4", news.userReaction === "dislike" && "fill-current")} />
        <span className="hidden md:inline">
          Dislike{news.dislikeCount > 0 ? ` (${news.dislikeCount})` : ""}
        </span>
      </Button>
    </>
  );
}

function ShareButton({ news }: { news: NewsWithAuthor }) {
  const handleShare = () => {
    const postUrl = `${window.location.origin}/news/${news.id}`;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="flex-1 gap-2 text-muted-foreground"
      onClick={handleShare}
    >
      <Share2 className="size-4" />
      <span className="hidden md:inline">Share</span>
    </Button>
  );
}

function CommentButton({ news }: { news: NewsWithAuthor }) {
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
          Comment{news.commentCount > 0 ? ` (${news.commentCount})` : ""}
        </span>
      </Button>

      <CommentsDialog news={news} open={open} onOpenChange={setOpen} />
    </>
  );
}

export default function NewsCard({ news }: { news: NewsWithAuthor }) {
  const categoryConfig = CATEGORY_CONFIG[news.category];
  const CategoryIcon = categoryConfig.icon;

  return (
    <Card>
      <CardHeader className="p-4 pb-3 flex-row items-start justify-between gap-2 space-y-0">
        <div className="flex items-center gap-3">
          <div className="relative size-10 rounded-full overflow-hidden bg-muted shrink-0">
            {news.authorImageUrl && (
              <Image
                src={news.authorImageUrl}
                alt={news.authorName}
                fill
                className="object-cover"
                unoptimized
              />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm leading-tight">{news.authorName}</p>
              {news.pinned && (
                <span className="flex items-center gap-1 text-xs font-medium text-primary">
                  <Pin className="size-3 fill-current" />
                  Pinned
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {roleLabel(news.authorRole)} &middot; {formatDate(new Date(news.createdAt))}
            </p>
          </div>
        </div>
        <NewsCardMenu news={news} />
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        <Badge className={cn("gap-1.5 rounded-full", categoryConfig.className)}>
          <CategoryIcon className="size-3" />
          {news.category}
        </Badge>

        <h3 className="font-bold text-base">{news.title}</h3>

        <p className="text-sm text-muted-foreground leading-relaxed">{news.content}</p>

        {news.media.length > 0 && <MediaGrid media={news.media} />}

        {news.attachments.length > 0 && (
          <div className="space-y-1 rounded-lg border p-1">
            {news.attachments.map((item, index) => (
              <DownloadableAttachment key={index} item={item} />
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="px-1 pb-1 pt-1 border-t gap-0">
        <ReactionButtons news={news} />
        <CommentButton news={news} />
        <ShareButton news={news} />
      </CardFooter>
    </Card>
  );
}
