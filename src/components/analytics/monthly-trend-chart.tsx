"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MonthlyCounts } from "@/actions/analytics";
import { formatMonth } from "@/lib/analytics";

// Lines are drawn in this order, which is the order the --chart-* colors are meant to be used in.
const chartConfig = {
  documentRequests: { label: "Document Requests", color: "var(--chart-1)" },
  complaints: { label: "Complaints", color: "var(--chart-2)" },
  courtReservations: { label: "Court Reservations", color: "var(--chart-3)" },
  businesses: { label: "Community Hub", color: "var(--chart-4)" },
} satisfies ChartConfig;

const SERIES = Object.keys(chartConfig) as (keyof typeof chartConfig)[];

// Lists the legend's and tooltip's items in the lines' order. Recharts sorts them by name otherwise.
const bySeriesOrder = (item: { dataKey?: unknown }) => SERIES.indexOf(item.dataKey as keyof typeof chartConfig);

// `trend` is undefined while loading.
export default function MonthlyTrendChart({ trend }: { trend: MonthlyCounts[] | undefined }) {
  return (
    <Card>
      <Tabs defaultValue="chart" className="gap-0">
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Submissions per Month</CardTitle>
            <CardDescription>
              {trend
                ? `${formatMonth(trend[0].month)} to ${formatMonth(trend[trend.length - 1].month)}`
                : "The last 12 months"}
            </CardDescription>
          </div>
          <TabsList>
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent>
          {!trend ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <>
              <TabsContent value="chart">
                <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
                  <LineChart accessibilityLayer data={trend} margin={{ top: 8, right: 12, left: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(month: string) => formatMonth(month, true)}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                      domain={[0, (dataMax: number) => Math.max(dataMax, 4)]}
                    />
                    <ChartTooltip
                      itemSorter={bySeriesOrder}
                      content={
                        <ChartTooltipContent
                          className="min-w-48"
                          indicator="line"
                          labelFormatter={(month) => formatMonth(String(month))}
                        />
                      }
                    />
                    <ChartLegend itemSorter={bySeriesOrder} content={<ChartLegendContent className="flex-wrap" />} />
                    {SERIES.map((key) => (
                      <Line
                        key={key}
                        dataKey={key}
                        type="linear"
                        stroke={`var(--color-${key})`}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
              </TabsContent>
              <TabsContent value="table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      {SERIES.map((key) => (
                        <TableHead key={key} className="text-right">
                          {chartConfig[key].label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Newest first, so the month being viewed is on top. */}
                    {[...trend].reverse().map((counts) => (
                      <TableRow key={counts.month}>
                        <TableCell>{formatMonth(counts.month)}</TableCell>
                        {SERIES.map((key) => (
                          <TableCell key={key} className="text-right tabular-nums">
                            {counts[key]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
}
