"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search, ShieldCheck, Users } from "lucide-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getUserStats, getUsers } from "@/actions/user-management";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/stat-card";
import UserActionsMenu from "@/components/user-management/user-actions-menu";
import DeletedUsersTable from "@/components/user-management/deleted-users-table";
import { roleLabel } from "@/lib/roles";

const ROLE_FILTERS = [
  { value: "all", label: "All Roles" },
  { value: "resident", label: "Resident" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Super Admin" },
];

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

function roleBadgeVariant(role: string) {
  if (role === "superadmin") return "default";
  if (role === "admin") return "secondary";
  return "outline";
}

function UserRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-14 rounded-full" />
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

export default function UserManagementTable() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["users", "stats"],
    queryFn: () => getUserStats(),
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["users", { search: debouncedSearch, role }],
      queryFn: ({ pageParam }) =>
        getUsers({ offset: pageParam, search: debouncedSearch, role }),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextOffset,
    });

  const users = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2">
        <StatCard
          label="Residents"
          value={stats?.residents ?? 0}
          description="Registered residents"
          icon={Users}
          isLoading={isStatsLoading}
        />
        <StatCard
          label="Admins"
          value={stats?.admins ?? 0}
          description="Admins and super admins"
          icon={ShieldCheck}
          isLoading={isStatsLoading}
          iconClassName="bg-violet-500/10 text-violet-600"
        />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Users</TabsTrigger>
          <TabsTrigger value="deleted">Deleted Users</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 pt-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="pl-8"
              />
            </div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    <UserRowSkeleton />
                    <UserRowSkeleton />
                    <UserRowSkeleton />
                  </>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Image
                              src={user.imageUrl}
                              alt={user.fullName}
                              width={36}
                              height={36}
                              className="size-9 shrink-0 rounded-full object-cover"
                            />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{user.fullName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleBadgeVariant(user.role)} className="capitalize">
                            {roleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.banned ? (
                            <Badge variant="destructive">Banned</Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-emerald-600 border-emerald-600/30 dark:text-emerald-400"
                            >
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <UserActionsMenu
                            userId={user.id}
                            userName={user.fullName}
                            role={user.role}
                            isBanned={user.banned}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {hasNextPage && (
                      <LoadMoreTrigger onIntersect={fetchNextPage} disabled={isFetchingNextPage} />
                    )}
                    {isFetchingNextPage && <UserRowSkeleton />}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="deleted" className="pt-2">
          <DeletedUsersTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
