"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import BusinessSubmissionsTable from "@/components/community-hub/business-submissions-table";
import { getBusinessesByUser } from "@/actions/business";

export default function UserBusinessesTable({ userId }: { userId: string }) {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["businesses", "user", userId],
    queryFn: ({ pageParam }) => getBusinessesByUser(userId, { offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

  const businesses = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <BusinessSubmissionsTable
      businesses={businesses}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={isFetchingNextPage}
    />
  );
}
