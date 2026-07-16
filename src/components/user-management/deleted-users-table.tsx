"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getDeletedUsers } from "@/actions/user-management";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { roleLabel } from "@/lib/roles";

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

function roleBadgeVariant(role: string | null) {
  if (role === "superadmin") return "default";
  if (role === "admin") return "secondary";
  return "outline";
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function DeletedUserRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-8 w-8 rounded-md ml-auto" />
      </TableCell>
    </TableRow>
  );
}

function LoadMoreTrigger({
  onIntersect,
  disabled,
}: {
  onIntersect: () => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onIntersect();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect, disabled]);

  return (
    <TableRow ref={ref}>
      <TableCell colSpan={5} className="h-1 p-0" />
    </TableRow>
  );
}

export default function DeletedUsersTable() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["deletedUsers", { search: debouncedSearch }],
      queryFn: ({ pageParam }) =>
        getDeletedUsers({ offset: pageParam, search: debouncedSearch }),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextOffset,
    });

  const users = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-8"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Deleted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                <DeletedUserRowSkeleton />
                <DeletedUserRowSkeleton />
                <DeletedUserRowSkeleton />
              </>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  No deleted users.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(user.role)} className="capitalize">
                        {roleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.joinedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.deletedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={`/portal/profile/${user.userId}`}>
                          <UserRound />
                          <span className="sr-only">View Profile</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {hasNextPage && (
                  <LoadMoreTrigger onIntersect={fetchNextPage} disabled={isFetchingNextPage} />
                )}
                {isFetchingNextPage && <DeletedUserRowSkeleton />}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
