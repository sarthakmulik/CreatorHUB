"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Legend,
} from "recharts";
import { formatNumber } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface Snapshot { date: string; followers: number; views: number; }

interface GrowthChartProps {
  snapshots: Snapshot[];
  accountName?: string;
  platform?: string;
}

const DATE_RANGES = [
  { label: "7D",  days: 7  },
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(13,13,31,0.95)",
        border: "1px solid rgba(124,58,237,0.3)",
        borderRadius: 12,
        padding: "12px 16px",
        backdropFilter: "blur(20px)",
      }}
    >
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: entry.color }} />
          <span style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "capitalize" }}>
            {entry.dataKey}:
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            {formatNumber(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function GrowthChart({ snapshots, accountName = "YouTube", platform = "all" }: GrowthChartProps) {
  const [metric, setMetric] = useState<"followers" | "views">("followers");
  const [rangeIdx, setRangeIdx] = useState(2); // default 30D

  const { days } = DATE_RANGES[rangeIdx];
  const data = snapshots.slice(-days);

  // Calculate growth % for header
  const first = data[0]?.[metric] ?? 0;
  const last  = data[data.length - 1]?.[metric] ?? 0;
  const growthPct = first > 0 ? (((last - first) / first) * 100).toFixed(1) : "0.0";
  const isPositive = parseFloat(growthPct) >= 0;

  // Format X axis dates: show abbreviated date
  const formatXAxis = (val: string) =>
    new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="glass" style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <TrendingUp size={16} color="#a78bfa" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Growth Chart
            </span>
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)" }}>
            {accountName}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: isPositive ? "#34d399" : "#f87171", fontFamily: "'Space Grotesk', sans-serif" }}>
              {isPositive ? "+" : ""}{growthPct}%
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {metric === "followers" ? (platform === "instagram" ? "followers" : "subscribers") : "views"} over {days} days
            </span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Metric toggle */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3, border: "1px solid var(--border-subtle)" }}>
            {(["followers", "views"] as const).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  transition: "all 0.2s",
                  background: metric === m ? "rgba(124,58,237,0.3)" : "transparent",
                  color: metric === m ? "#a78bfa" : "var(--text-muted)",
                  fontFamily: "inherit",
                }}
              >
                {m === "followers" ? (platform === "instagram" ? "Followers" : "Subscribers") : "Views"}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3, border: "1px solid var(--border-subtle)" }}>
            {DATE_RANGES.map((r, i) => (
              <button
                key={r.label}
                onClick={() => setRangeIdx(i)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  transition: "all 0.2s",
                  background: rangeIdx === i ? "rgba(124,58,237,0.3)" : "transparent",
                  color: rangeIdx === i ? "#a78bfa" : "var(--text-muted)",
                  fontFamily: "inherit",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gradFollowers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatNumber}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey={metric}
            stroke={metric === "followers" ? "#7c3aed" : "#22d3ee"}
            strokeWidth={2.5}
            fill={metric === "followers" ? "url(#gradFollowers)" : "url(#gradViews)"}
            dot={false}
            activeDot={{ r: 5, fill: metric === "followers" ? "#a78bfa" : "#22d3ee", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
