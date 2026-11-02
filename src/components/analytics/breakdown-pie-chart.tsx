"use client";

import { Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { BreakdownItem } from "@/actions/analytics";

// One per --chart color. Items past them share a gray, since more colors than that are hard to tell
// apart in a pie, and the legend names every item anyway.
const COLORED_ITEMS = 5;

const chartConfig = {} satisfies ChartConfig;

function itemColor(index: number) {
  return index < COLORED_ITEMS ? `var(--chart-${index + 1})` : "var(--muted-foreground)";
}

// A donut of the items, most first (the order getMonthlyAnalytics ranks them in), with a legend of
// their counts beside it.
export default function BreakdownPieChart({ title, data }: { title: string; data: BreakdownItem[] }) {
  const slices = data.map((item, index) => ({ ...item, fill: itemColor(index) }));

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <ChartContainer config={chartConfig} className="aspect-square size-32 shrink-0">
          <PieChart>
            <ChartTooltip
              allowEscapeViewBox={{ x: true, y: true }}
              content={<ChartTooltipContent nameKey="label" hideLabel />}
            />
            <Pie
              data={slices}
              dataKey="count"
              nameKey="label"
              innerRadius="60%"
              outerRadius="100%"
              // Clockwise from 12 o'clock, rather than Recharts' counterclockwise from 3.
              startAngle={90}
              endAngle={-270}
              // Gaps between slices. A lone slice gets none, or it shows as a seam in the ring.
              stroke="var(--card)"
              strokeWidth={slices.length > 1 ? 2 : 0}
            />
          </PieChart>
        </ChartContainer>
        <ul className="min-w-40 max-w-72 flex-1 space-y-1.5 text-xs">
          {slices.map(({ label, count, fill }) => (
            <li key={label} className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-xs" style={{ backgroundColor: fill }} />
              <span className="flex-1 text-muted-foreground">{label}</span>
              <span className="font-medium tabular-nums">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
