"use client";

import { useQuery } from "@tanstack/react-query";
import ViewBusinessDialog from "@/components/community-hub/dialogs/view-business-dialog";
import { useViewParam } from "@/hooks/use-view-param";
import { getVerifiedBusinessById } from "@/actions/business";
import { BUSINESS_SEARCH_PARAM } from "@/lib/business";

// `?business=<id>` (e.g. from the AI assistant's business buttons) opens that business's details,
// the same dialog as clicking its card. It's fetched by id since it may not be in the loaded list.
export default function LinkedBusinessDialog() {
  const [businessId, setBusinessId] = useViewParam(BUSINESS_SEARCH_PARAM);
  const { data: business } = useQuery({
    queryKey: ["businesses", "details", businessId],
    queryFn: () => getVerifiedBusinessById(businessId!),
    enabled: businessId !== null,
  });

  if (!business || businessId === null) return null;
  return <ViewBusinessDialog business={business} open onOpenChange={(open) => !open && setBusinessId(null)} />;
}
