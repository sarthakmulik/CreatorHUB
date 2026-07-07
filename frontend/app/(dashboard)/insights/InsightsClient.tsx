"use client";
import { API_URL } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";

const COLOR_MAP: Record<string, { bg: string; border: string; glow: string }> = {
  purple: { bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.25)", glow: "#a78bfa" },
  cyan:   { bg: "rgba(34,211,238,0.06)", border: "rgba(34,211,238,0.2)",  glow: "#22d3ee" },
  green:  { bg: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.2)",  glow: "#34d399" },
};

export default function InsightsClient({ userId }: { userId: string }) {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/api/insights/generate?user_id=${userId}`);
      
      if (!res.ok) {
        let errorMsg = "Failed to generate AI insights";
        try {
          const errorData = await res.json();
          if (errorData.detail) errorMsg = errorData.detail;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      
      const data = await res.json();
      setInsights(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [userId]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)" }}>
            AI Insights
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Actionable analysis generated from your creator data
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={fetchInsights}
            disabled={loading}
            className="btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px" }}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Analyzing..." : "Refresh Insights"}
          </button>
        </div>
      </div>

      {loading && insights.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 100 }}>
          <div className="spinner" style={{ width: 48, height: 48, border: "4px solid rgba(124,58,237,0.3)", borderTopColor: "var(--accent-primary)", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 24 }} />
          <h2 style={{ fontSize: 18, color: "var(--text-primary)", fontWeight: 700 }}>AI is analyzing your content...</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: 8 }}>This usually takes 10-15 seconds.</p>
        </div>
      ) : error ? (
        <div style={{ padding: 40, textAlign: "center", background: "rgba(239, 68, 68, 0.05)", borderRadius: 16, border: "1px dashed rgba(239, 68, 68, 0.3)" }}>
          <AlertCircle size={40} color="#ef4444" style={{ margin: "0 auto 16px auto" }} />
          <h2 style={{ fontSize: 20, color: "var(--text-primary)", marginBottom: 8 }}>Generation Failed</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>{error}</p>
          <button className="btn-secondary" onClick={fetchInsights}>Try Again</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {insights.map((insight, i) => {
            const c = COLOR_MAP[insight.color] ?? COLOR_MAP.purple;
            return (
              <div
                key={insight.id || i}
                className="glass animate-fade-in-up"
                style={{
                  padding: "24px",
                  border: `1px solid ${c.border}`,
                  background: c.bg,
                  animationDelay: `${i * 100}ms`,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                      {insight.title}
                    </h3>
                    <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                      {insight.text}
                    </p>
                  </div>
                  <div
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      background: c.bg,
                      border: `1px solid ${c.border}`,
                      textAlign: "center",
                      flexShrink: 0,
                      minWidth: 80,
                    }}
                  >
                    <p style={{ fontSize: 15, fontWeight: 800, color: c.glow, fontFamily: "'Space Grotesk', sans-serif" }}>
                      {insight.metric}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
