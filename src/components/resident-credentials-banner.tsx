import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IdCard } from "lucide-react";

interface ResidentCredentialsBannerProps {
  userId: string | undefined;
  description: string;
}

export default function ResidentCredentialsBanner({
  userId,
  description,
}: ResidentCredentialsBannerProps) {
  return (
    <div className="flex flex-col justify-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center shadow-sm sm:p-10 md:items-center">
      <div className="flex size-12 items-center justify-center self-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <IdCard className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold leading-tight">Complete your Resident Credentials</p>
        <p className="mx-auto max-w-prose text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild className="mt-1">
        <Link href={`/portal/profile/${userId}`}>Complete Resident Credentials</Link>
      </Button>
    </div>
  );
}
