"use client";

import { useState } from "react";
import Image from "next/image";
import { Calendar, Megaphone, MessageSquare, MoreHorizontal, Pencil, Play, Share2, ThumbsDown, ThumbsUp, Trash2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { fetchFile } from "@/lib/storage";
import type { NewsWithAuthor } from "@/actions/news";
import EditNewsDialog from "./edit-news-dialog";
import DeleteNewsDialog from "./delete-news-dialog";

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

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function MediaGrid({ media }: { media: NewsWithAuthor["media"] }) {
  if (!media.length) return null;

  const items = media.slice(0, 4);

  return (
    <div
      className={cn(
        "grid gap-0.5 rounded-lg overflow-hidden",
        items.length === 1 ? "grid-cols-1" : "grid-cols-2"
      )}
    >
      {items.map((item, index) => {
        const url = item.key ? fetchFile(item.key) : "";
        return (
          <div key={index} className="relative aspect-video bg-muted">
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
          </div>
        );
      })}
    </div>
  );
}

function NewsCardMenu({ news }: { news: NewsWithAuthor }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
            <p className="font-semibold text-sm leading-tight">{news.authorName}</p>
            <p className="text-xs text-muted-foreground">
              {formatRole(news.authorRole)} &middot; {formatDate(new Date(news.createdAt))}
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
      </CardContent>

      <CardFooter className="px-1 pb-1 pt-1 border-t gap-0">
        <Button variant="ghost" size="sm" className="flex-1 gap-2 text-muted-foreground">
          <ThumbsUp className="size-4" />
          <span className="hidden md:inline">Like</span>
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 gap-2 text-muted-foreground">
          <ThumbsDown className="size-4" />
          <span className="hidden md:inline">Dislike</span>
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 gap-2 text-muted-foreground">
          <MessageSquare className="size-4" />
          <span className="hidden md:inline">Comment</span>
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 gap-2 text-muted-foreground">
          <Share2 className="size-4" />
          <span className="hidden md:inline">Share</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
