import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
  isLoading?: boolean;
  iconClassName?: string;
};

export default function StatCard({
  label,
  value,
  description,
  icon: Icon,
  isLoading,
  iconClassName,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-1 justify-between">
          <p className="text-sm font-medium">{label}</p>
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary",
              iconClassName
            )}
          >
            <Icon className="size-4" />
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="mt-4 h-8 w-12" />
        ) : (
          <p className="mt-4 text-3xl font-bold">{value}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
