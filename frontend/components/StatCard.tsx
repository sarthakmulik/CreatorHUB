"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  trend?: number; // percentage change (positive = up, negative = down)
  trendLabel?: string;
  icon?: React.ReactNode;
  color?: "purple" | "cyan" | "green" | "amber" | "pink";
  delay?: number;
  format?: "number" | "decimal";
}

const COLOR_MAP = {
  purple: { start: "#7c3aed", end: "#4f46e5", glow: "rgba(124,58,237,0.3)", bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.25)" },
  cyan:   { start: "#06b6d4", end: "#22d3ee", glow: "rgba(34,211,238,0.2)", bg: "rgba(34,211,238,0.06)", border: "rgba(34,211,238,0.2)"  },
  green:  { start: "#059669", end: "#34d399", glow: "rgba(52,211,153,0.2)", bg: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.2)"  },
  amber:  { start: "#d97706", end: "#fbbf24", glow: "rgba(251,191,36,0.2)", bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.2)"  },
  pink:   { start: "#db2777", end: "#f472b6", glow: "rgba(244,114,182,0.2)", bg: "rgba(244,114,182,0.06)", border: "rgba(244,114,182,0.2)" },
};

/** Animated counter that counts up from 0 to the target value. */
function AnimatedNumber({ target, prefix = "", suffix = "", format = "number" }: {
  target: number; prefix?: string; suffix?: string; format?: "number" | "decimal";
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let frame: number;
    const duration = 1400;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setCurrent(target);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const display = format === "decimal" ? current.toFixed(1) : formatNumber(current);
  return <>{prefix}{display}{suffix}</>;
}

export default function StatCard({
  label,
  value,
  suffix = "",
  prefix = "",
  trend,
  trendLabel,
  icon,
  color = "purple",
  delay = 0,
  format = "number",
}: StatCardProps) {
  const c = COLOR_MAP[color];

  return (
    <div
      className="glass animate-fade-in-up"
      style={{
        padding: "24px",
        animationDelay: `${delay}ms`,
        opacity: 0,
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "default",
        border: `1px solid ${c.border}`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px ${c.glow}`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Background glow blob */}
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${c.bg} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Icon + label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {label}
        </span>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: c.bg,
              border: `1px solid ${c.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div
        className="stat-number"
        style={{
          fontSize: 34,
          background: `linear-gradient(135deg, ${c.start}, ${c.end})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: 12,
        }}
      >
        <AnimatedNumber target={value} prefix={prefix} suffix={suffix} format={format} />
      </div>

      {/* Trend */}
      {trend !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {trend > 0 ? (
            <TrendingUp size={14} className="trend-up" />
          ) : trend < 0 ? (
            <TrendingDown size={14} className="trend-down" />
          ) : (
            <Minus size={14} style={{ color: "var(--text-muted)" }} />
          )}
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: trend > 0 ? "var(--accent-green)" : trend < 0 ? "#f87171" : "var(--text-muted)",
            }}
          >
            {trend > 0 ? "+" : ""}{trend}%
          </span>
          {trendLabel && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
