import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMonth } from "@/lib/analytics";

type BreakdownCardProps = {
  icon: LucideIcon;
  title: string;
  month: string;
  // How many were submitted in the month, or undefined while loading.
  total: number | undefined;
  children: React.ReactNode;
};

// One service's breakdown on the Analytics page. `children` (its charts) only show when something
// was submitted in the month.
export default function BreakdownCard({ icon: Icon, title, month, total, children }: BreakdownCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <CardTitle>{title}</CardTitle>
          {total === undefined ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <p className="text-sm text-muted-foreground">
              {total} submitted in {formatMonth(month)}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {total === undefined ? (
          <Skeleton className="h-48 w-full" />
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to break down for this month.</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
