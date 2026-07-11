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
    <div className="flex flex-col justify-center gap-3 rounded-xl border border-border bg-card p-10 text-center shadow-sm md:items-center">
      <IdCard className="self-center size-8 text-muted-foreground" />
      <div>
        <p className="font-semibold leading-tight">Complete your Resident Credentials</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild className="mt-1">
        <Link href={`/portal/profile/${userId}`}>Complete Resident Credentials</Link>
      </Button>
    </div>
  );
}
