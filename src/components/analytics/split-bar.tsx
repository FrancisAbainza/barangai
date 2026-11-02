import type { BreakdownItem } from "@/actions/analytics";

// One whole split into its parts (a month's requests by status, say): a thin bar with a segment per
// part sized by its count, and a legend with every part's count. Colors go by the parts' order
// (--chart-1 for the first), so a part keeps its color when another one is 0. Up to 5 parts.
export default function SplitBar({ title, data }: { title: string; data: BreakdownItem[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {data.map(
          ({ label, count }, index) =>
            count > 0 && (
              <div
                key={label}
                title={`${label}: ${count}`}
                style={{ flexGrow: count, backgroundColor: `var(--chart-${index + 1})` }}
              />
            )
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {data.map(({ label, count }, index) => (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-xs"
              style={{ backgroundColor: `var(--chart-${index + 1})` }}
            />
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium tabular-nums">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
