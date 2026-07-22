"use client";

import { useState } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar, Megaphone, MessageSquare, MoreHorizontal, Pencil, Pin, Share2, ThumbsDown, ThumbsUp, Trash2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDateTime } from "@/lib/utils";
import { isSuperAdminRole, roleLabel } from "@/lib/roles";
import { setNewsReaction } from "@/actions/news";
import type { NewsPage, NewsWithAuthor } from "@/actions/news";
import { MediaGrid, AttachmentList } from "@/components/media-gallery";
import EditNewsDialog from "./edit-news-dialog";
import DeleteNewsDialog from "./delete-news-dialog";
import CommentsDialog from "./comments-dialog";

const CATEGORY_CONFIG = {
  Announcement: { icon: Megaphone, className: "bg-green-700 text-white hover:bg-green-700" },
  Event: { icon: Calendar, className: "bg-blue-600 text-white hover:bg-blue-600" },
  Emergency: { icon: TriangleAlert, className: "bg-red-600 text-white hover:bg-red-600" },
} as const;

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
      const previousQueries = queryClient.getQueriesData<InfiniteData<NewsPage, number>>({
        queryKey: ["news"],
      });

      queryClient.setQueriesData<InfiniteData<NewsPage, number>>({ queryKey: ["news"] }, (old) => {
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

      return { previousQueries };
    },
    onError: (_err, _type, context) => {
      context?.previousQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
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
        <span className="hidden md:inline">Like</span>
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
        <span className="hidden md:inline">Dislike</span>
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

function CommentButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="flex-1 gap-2 text-muted-foreground"
      onClick={onClick}
    >
      <MessageSquare className="size-4" />
      <span className="hidden md:inline">Comment</span>
    </Button>
  );
}

function ReactionSummary({ news, onCommentClick }: { news: NewsWithAuthor; onCommentClick: () => void }) {
  if (news.likeCount === 0 && news.dislikeCount === 0 && news.commentCount === 0) return null;

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        {news.likeCount > 0 && (
          <span className="flex items-center gap-1">
            <ThumbsUp className="size-3.5 fill-current" />
            {news.likeCount}
          </span>
        )}
        {news.dislikeCount > 0 && (
          <span className="flex items-center gap-1">
            <ThumbsDown className="size-3.5 fill-current" />
            {news.dislikeCount}
          </span>
        )}
      </div>
      {news.commentCount > 0 && (
        <button type="button" onClick={onCommentClick} className="hover:underline">
          {news.commentCount} comment{news.commentCount !== 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}

export default function NewsCard({ news }: { news: NewsWithAuthor }) {
  const categoryConfig = CATEGORY_CONFIG[news.category];
  const CategoryIcon = categoryConfig.icon;
  const [commentsOpen, setCommentsOpen] = useState(false);

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
              {roleLabel(news.authorRole)} &middot; {formatDateTime(new Date(news.createdAt))}
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

        <MediaGrid media={news.media} />

        <AttachmentList attachments={news.attachments} />

        <ReactionSummary news={news} onCommentClick={() => setCommentsOpen(true)} />
      </CardContent>

      <CardFooter className="px-1 pb-1 pt-1 border-t gap-0">
        <ReactionButtons news={news} />
        <CommentButton onClick={() => setCommentsOpen(true)} />
        <ShareButton news={news} />
      </CardFooter>

      <CommentsDialog news={news} open={commentsOpen} onOpenChange={setCommentsOpen} />
    </Card>
  );
}
