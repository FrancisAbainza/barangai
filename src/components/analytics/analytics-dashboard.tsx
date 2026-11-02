"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChartColumn,
  FileText,
  Megaphone,
  MessageSquareWarning,
  SportShoe,
  Store,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import PageHeader from "@/components/page-header";
import StatCard from "@/components/stat-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BreakdownPieChart from "@/components/analytics/breakdown-pie-chart";
import BreakdownCard from "@/components/analytics/breakdown-card";
import MonthlyTrendChart from "@/components/analytics/monthly-trend-chart";
import SplitBar from "@/components/analytics/split-bar";
import { getAnalyticsFirstMonth, getMonthlyAnalytics, type MonthlyCounts } from "@/actions/analytics";
import { formatMonth, getCurrentMonth, shiftMonth } from "@/lib/analytics";
import { formatFee } from "@/lib/court-reservations";
import { cn } from "@/lib/utils";

const SUMMARY_TILES: { key: keyof Omit<MonthlyCounts, "month">; label: string; icon: LucideIcon }[] = [
  { key: "documentRequests", label: "Document Requests", icon: FileText },
  { key: "complaints", label: "Complaints", icon: MessageSquareWarning },
  { key: "courtReservations", label: "Court Reservations", icon: SportShoe },
  { key: "businesses", label: "Community Hub", icon: Store },
  { key: "newsPosts", label: "News Posts", icon: Megaphone },
  { key: "newUsers", label: "New Users", icon: UserPlus },
];

function describeChange(current: number, previous: number) {
  if (current > previous) return `${current - previous} more than last month`;
  if (current < previous) return `${previous - current} fewer than last month`;
  return "Same as last month";
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const currentMonth = getCurrentMonth();
  const [month, setMonth] = useState(currentMonth);

  const { data: firstMonth = currentMonth } = useQuery({
    queryKey: ["analytics", "first-month"],
    queryFn: getAnalyticsFirstMonth,
  });

  const { data, isPlaceholderData } = useQuery({
    queryKey: ["analytics", "monthly", month],
    queryFn: () => getMonthlyAnalytics(month),
    // Keeps the previous month's report up, dimmed, while the picked one loads.
    placeholderData: keepPreviousData,
  });

  // Newest first, back to the first month with any data.
  const monthOptions: string[] = [];
  for (let option = currentMonth; option >= firstMonth; option = shiftMonth(option, -1)) {
    monthOptions.push(option);
  }

  // The report's last two months: the one shown (which lags behind `month` while loading) and the
  // one before it, for the tiles' comparison.
  const shown = data?.trend.at(-1);
  const previous = data?.trend.at(-2);
  const shownMonth = shown?.month ?? month;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        icon={ChartColumn}
        title="Analytics"
        description="Monthly reports on the portal's requests, complaints, reservations, posts and sign-ups"
      >
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Month">
            <CalendarDays className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {formatMonth(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      <div className={cn("space-y-6 transition-opacity", isPlaceholderData && "opacity-60")}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {SUMMARY_TILES.map(({ key, label, icon }) => (
            <StatCard
              key={key}
              label={label}
              value={shown?.[key] ?? 0}
              description={shown && previous ? describeChange(shown[key], previous[key]) : "Compared with last month"}
              icon={icon}
              isLoading={!data}
            />
          ))}
        </div>

        <MonthlyTrendChart trend={data?.trend} />

        {/* Two columns that each stack their cards, so a short card isn't followed by the empty space
            a grid row would leave beside a taller one. */}
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <BreakdownCard
              icon={FileText}
              title="Document Requests"
              month={shownMonth}
              total={shown?.documentRequests}
            >
              {data && (
                <>
                  <SplitBar title="By status" data={data.documentRequests.byStatus} />
                  <BreakdownPieChart title="By document type" data={data.documentRequests.byType} />
                </>
              )}
            </BreakdownCard>

            <BreakdownCard
              icon={SportShoe}
              title="Court Reservations"
              month={shownMonth}
              total={shown?.courtReservations}
            >
              {data && (
                <>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <Figure label="Hours booked" value={String(data.courtReservations.approvedHours)} />
                      <Figure label="Fees" value={formatFee(data.courtReservations.approvedFees)} />
                    </div>
                    <p className="text-xs text-muted-foreground">From the approved reservations.</p>
                  </div>
                  <SplitBar title="By status" data={data.courtReservations.byStatus} />
                </>
              )}
            </BreakdownCard>
          </div>

          <div className="space-y-6">
            <BreakdownCard icon={MessageSquareWarning} title="Complaints" month={shownMonth} total={shown?.complaints}>
              {data && (
                <>
                  <SplitBar title="By status" data={data.complaints.byStatus} />
                  <SplitBar title="By priority" data={data.complaints.byPriority} />
                  <BreakdownPieChart title="By category" data={data.complaints.byCategory} />
                </>
              )}
            </BreakdownCard>

            <BreakdownCard icon={Store} title="Community Hub" month={shownMonth} total={shown?.businesses}>
              {data && (
                <>
                  <SplitBar title="By status" data={data.businesses.byStatus} />
                  <BreakdownPieChart title="By category" data={data.businesses.byCategory} />
                </>
              )}
            </BreakdownCard>
          </div>
        </div>
      </div>
    </div>
  );
}
