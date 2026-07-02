"use client";

import { useState } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addNewsComment, deleteNewsComment, getNewsComments } from "@/actions/news";
import type { NewsCommentWithAuthor, NewsWithAuthor } from "@/actions/news";
import { cn } from "@/lib/utils";

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function Avatar({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative size-8 shrink-0 rounded-full overflow-hidden bg-muted">
      {src && <Image src={src} alt={alt} fill className="object-cover" unoptimized />}
    </div>
  );
}

function CommentItem({
  comment,
  isOwn,
  onDelete,
  onReply,
  isReplying,
}: {
  comment: NewsCommentWithAuthor;
  isOwn: boolean;
  onDelete: (id: number) => void;
  onReply?: (comment: NewsCommentWithAuthor) => void;
  isReplying?: boolean;
}) {
  return (
    <div className="group flex items-start gap-2">
      <Avatar src={comment.authorImageUrl} alt={comment.authorName} />
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl bg-muted px-3 py-2">
          <p className="text-xs font-semibold">{comment.authorName}</p>
          <p className="text-sm whitespace-pre-wrap wrap-break-word">{comment.content}</p>
        </div>
        <div className="flex items-center gap-2 px-3 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(new Date(comment.createdAt))}
          </span>
          {onReply && (
            <button
              onClick={() => onReply(comment)}
              className={cn(
                "text-xs text-muted-foreground hover:text-foreground transition-opacity",
                isReplying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              Reply
            </button>
          )}
          {isOwn && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommentsDialog({
  news,
  open,
  onOpenChange,
}: {
  news: NewsWithAuthor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<NewsCommentWithAuthor | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const commentsQueryKey = ["news-comments", news.id];

  const { data: comments = [], isLoading } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () => getNewsComments(news.id),
    enabled: open,
  });

  const topLevelComments = comments.filter((comment) => comment.parentId === null);
  const repliesByParent = comments.reduce<Map<number, NewsCommentWithAuthor[]>>((map, comment) => {
    if (comment.parentId === null) return map;
    const existing = map.get(comment.parentId) ?? [];
    existing.push(comment);
    map.set(comment.parentId, existing);
    return map;
  }, new Map());

  const { mutate: postComment, isPending: isPosting } = useMutation({
    mutationFn: ({ text, parentId }: { text: string; parentId?: number }) =>
      addNewsComment(news.id, text, parentId),
    onMutate: async ({ text, parentId }) => {
      await queryClient.cancelQueries({ queryKey: commentsQueryKey });
      const previous = queryClient.getQueryData<NewsCommentWithAuthor[]>(commentsQueryKey);

      const optimisticComment: NewsCommentWithAuthor = {
        id: -Date.now(),
        newsId: news.id,
        parentId: parentId ?? null,
        userId: user?.id ?? "",
        content: text,
        createdAt: new Date(),
        authorName: user
          ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "You"
          : "You",
        authorImageUrl: user?.imageUrl ?? "",
      };

      queryClient.setQueryData<NewsCommentWithAuthor[]>(commentsQueryKey, (old) => [
        ...(old ?? []),
        optimisticComment,
      ]);

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(commentsQueryKey, context.previous);
      toast.error("Failed to post comment. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
  });

  const { mutate: removeComment } = useMutation({
    mutationFn: (id: number) => deleteNewsComment(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: commentsQueryKey });
      const previous = queryClient.getQueryData<NewsCommentWithAuthor[]>(commentsQueryKey);

      queryClient.setQueryData<NewsCommentWithAuthor[]>(commentsQueryKey, (old) =>
        old?.filter((comment) => comment.id !== id)
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(commentsQueryKey, context.previous);
      toast.error("Failed to delete comment. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
  });

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed || isPosting) return;
    postComment({ text: trimmed });
    setContent("");
  };

  const handleReplySubmit = () => {
    const trimmed = replyContent.trim();
    if (!trimmed || !replyTo || isPosting) return;
    postComment({ text: trimmed, parentId: replyTo.parentId ?? replyTo.id });
    setReplyContent("");
    setReplyTo(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-lg max-h-[80vh]">
        <DialogHeader className="p-5 border-b text-lg">
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <p className="text-sm text-center text-muted-foreground py-8">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-8">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            topLevelComments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                <CommentItem
                  comment={comment}
                  isOwn={!!user && comment.userId === user.id}
                  onDelete={removeComment}
                  onReply={(target) => {
                    setReplyTo((current) => (current?.id === target.id ? null : target));
                    setReplyContent("");
                  }}
                  isReplying={replyTo?.id === comment.id}
                />

                {(repliesByParent.get(comment.id) ?? []).length > 0 && (
                  <div className="ml-10 space-y-3">
                    {repliesByParent.get(comment.id)!.map((reply) => (
                      <CommentItem
                        key={reply.id}
                        comment={reply}
                        isOwn={!!user && reply.userId === user.id}
                        onDelete={removeComment}
                        onReply={(target) => {
                          setReplyTo((current) => (current?.id === target.id ? null : target));
                          setReplyContent("");
                        }}
                        isReplying={replyTo?.id === reply.id}
                      />
                    ))}
                  </div>
                )}

                {replyTo && (replyTo.parentId ?? replyTo.id) === comment.id && (
                  <div className="ml-10 flex items-end gap-2">
                    <Avatar src={user?.imageUrl ?? ""} alt="You" />
                    <Textarea
                      autoFocus
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleReplySubmit();
                        }
                        if (e.key === "Escape") {
                          setReplyTo(null);
                          setReplyContent("");
                        }
                      }}
                      placeholder={`Reply to ${replyTo.authorName}…`}
                      className="min-h-9 max-h-32 resize-none rounded-2xl py-2"
                      disabled={isPosting}
                    />
                    <Button
                      size="icon"
                      className="shrink-0 rounded-full"
                      disabled={!replyContent.trim() || isPosting}
                      onClick={handleReplySubmit}
                    >
                      <SendHorizonal className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-end gap-2 p-4 pt-3 border-t">
          <Avatar src={user?.imageUrl ?? ""} alt="You" />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Write a comment…"
            className="min-h-9 max-h-32 resize-none rounded-2xl py-2"
            disabled={isPosting}
          />
          <Button
            size="icon"
            className="shrink-0 rounded-full"
            disabled={!content.trim() || isPosting}
            onClick={handleSubmit}
          >
            <SendHorizonal className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
